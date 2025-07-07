package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"hubpay/internal/models"
)

type ContractHandler struct {
	db *gorm.DB
}

func NewContractHandler(db *gorm.DB) *ContractHandler {
	return &ContractHandler{db: db}
}

func (h *ContractHandler) GetContracts(c *gin.Context) {
	var contracts []models.Contract
	if err := h.db.Preload("AE").Find(&contracts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch contracts"})
		return
	}

	c.JSON(http.StatusOK, contracts)
}

func (h *ContractHandler) CreateContract(c *gin.Context) {
	var req models.CreateContractRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("userID")

	contract := models.Contract{
		ClientName:     req.ClientName,
		AEID:           req.AEID,
		ContractValue:  req.ContractValue,
		ACV:            req.ACV,
		ContractType:   req.ContractType,
		ContractLength: req.ContractLength,
		PaymentTerms:   req.PaymentTerms,
		IsPilot:        req.IsPilot,
		CreatedBy:      userID,
	}

	if err := h.db.Create(&contract).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create contract"})
		return
	}

	// Load the AE information
	h.db.Preload("AE").First(&contract, contract.ID)

	c.JSON(http.StatusCreated, contract)
}

func (h *ContractHandler) DeleteContract(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid contract ID"})
		return
	}

	// Check if contract exists
	var contract models.Contract
	if err := h.db.First(&contract, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contract not found"})
		return
	}

	// Delete related invoices and commissions first
	h.db.Where("contract_id = ?", id).Delete(&models.Invoice{})
	h.db.Where("invoice_id IN (SELECT id FROM invoices WHERE contract_id = ?)", id).Delete(&models.Commission{})

	// Delete the contract
	if err := h.db.Delete(&contract).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete contract"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Contract deleted successfully"})
}