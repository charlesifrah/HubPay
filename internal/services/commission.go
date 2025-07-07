package services

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"hubpay/internal/models"
)

type CommissionService struct {
	db *gorm.DB
}

func NewCommissionService(db *gorm.DB) *CommissionService {
	return &CommissionService{db: db}
}

func (s *CommissionService) CalculateCommission(invoice models.Invoice) (*models.Commission, error) {
	// Get the contract
	var contract models.Contract
	if err := s.db.First(&contract, invoice.ContractID).Error; err != nil {
		return nil, fmt.Errorf("contract not found: %w", err)
	}

	// Get the AE's active commission config
	config, err := s.getActiveCommissionConfigForAE(contract.AEID)
	if err != nil {
		return nil, fmt.Errorf("failed to get commission config: %w", err)
	}

	// Calculate base commission
	baseCommission := int64(float64(invoice.Amount) * config.BaseRate)

	// Calculate bonuses
	pilotBonus := s.calculatePilotBonus(contract, invoice.Amount, config)
	multiYearBonus := s.calculateMultiYearBonus(contract, config)
	upfrontBonus := s.calculateUpfrontBonus(contract, config)

	totalCommission := baseCommission + pilotBonus + multiYearBonus + upfrontBonus

	// Apply OTE cap if necessary
	oteCapApplied := false
	if config.OTECap > 0 {
		capped, err := s.applyOTECap(contract.AEID, totalCommission, config)
		if err != nil {
			return nil, fmt.Errorf("failed to apply OTE cap: %w", err)
		}
		if capped {
			oteCapApplied = true
			totalCommission = int64(float64(totalCommission) * config.DeceleratorRate)
		}
	}

	commission := &models.Commission{
		InvoiceID:       invoice.ID,
		AEID:            contract.AEID,
		BaseCommission:  baseCommission,
		PilotBonus:      pilotBonus,
		MultiYearBonus:  multiYearBonus,
		UpfrontBonus:    upfrontBonus,
		TotalCommission: totalCommission,
		Status:          "pending",
		OTECapApplied:   oteCapApplied,
	}

	return commission, nil
}

func (s *CommissionService) getActiveCommissionConfigForAE(aeID uint) (*models.CommissionConfig, error) {
	var assignment models.AECommissionAssignment
	query := s.db.Preload("CommissionConfig").
		Where("ae_id = ? AND start_date <= ?", aeID, time.Now()).
		Where("end_date IS NULL OR end_date > ?", time.Now()).
		Order("start_date DESC")

	if err := query.First(&assignment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Return default configuration if no assignment found
			return s.getDefaultCommissionConfig()
		}
		return nil, err
	}

	return &assignment.CommissionConfig, nil
}

func (s *CommissionService) getDefaultCommissionConfig() (*models.CommissionConfig, error) {
	return &models.CommissionConfig{
		Name:               "Default Configuration",
		BaseRate:           0.10, // 10%
		PilotBonusRate:     0.02, // 2%
		MultiYearBonusRate: 0.01, // 1%
		UpfrontBonusRate:   0.01, // 1%
		OTECap:             100000000, // $1M in cents
		DeceleratorRate:    0.90, // 90%
	}, nil
}

func (s *CommissionService) calculatePilotBonus(contract models.Contract, invoiceAmount int64, config *models.CommissionConfig) int64 {
	if !contract.IsPilot || config.PilotBonusRate == 0 {
		return 0
	}
	return int64(float64(invoiceAmount) * config.PilotBonusRate)
}

func (s *CommissionService) calculateMultiYearBonus(contract models.Contract, config *models.CommissionConfig) int64 {
	if contract.ContractLength <= 12 || config.MultiYearBonusRate == 0 {
		return 0
	}
	return int64(float64(contract.ACV) * config.MultiYearBonusRate)
}

func (s *CommissionService) calculateUpfrontBonus(contract models.Contract, config *models.CommissionConfig) int64 {
	if contract.PaymentTerms != "upfront" || config.UpfrontBonusRate == 0 {
		return 0
	}
	return int64(float64(contract.ACV) * config.UpfrontBonusRate)
}

func (s *CommissionService) applyOTECap(aeID uint, newCommission int64, config *models.CommissionConfig) (bool, error) {
	if config.OTECap == 0 {
		return false, nil
	}

	// Get year-to-date commissions
	startOfYear := time.Date(time.Now().Year(), 1, 1, 0, 0, 0, 0, time.UTC)
	
	var totalCommissions int64
	if err := s.db.Model(&models.Commission{}).
		Where("ae_id = ? AND created_at >= ? AND status IN ?", aeID, startOfYear, []string{"approved", "paid"}).
		Select("COALESCE(SUM(total_commission), 0)").
		Scan(&totalCommissions).Error; err != nil {
		return false, err
	}

	return totalCommissions+newCommission > config.OTECap, nil
}