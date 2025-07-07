package models

import (
	"time"
	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Email    string `gorm:"unique;not null" json:"email" validate:"required,email"`
	Name     string `gorm:"not null" json:"name" validate:"required"`
	Password string `gorm:"not null" json:"-"`
	Role     string `gorm:"not null;default:ae" json:"role" validate:"required,oneof=admin ae"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Contract represents a sales contract
type Contract struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	ClientName      string    `gorm:"not null" json:"clientName" validate:"required"`
	AEID            uint      `gorm:"not null" json:"aeId" validate:"required"`
	AE              User      `gorm:"foreignKey:AEID" json:"ae,omitempty"`
	ContractValue   int64     `gorm:"not null" json:"contractValue" validate:"required,min=1"`
	ACV             int64     `gorm:"not null" json:"acv" validate:"required,min=1"`
	ContractType    string    `gorm:"not null" json:"contractType" validate:"required,oneof=new renewal upsell"`
	ContractLength  int       `gorm:"not null" json:"contractLength" validate:"required,min=1"`
	PaymentTerms    string    `gorm:"not null" json:"paymentTerms" validate:"required,oneof=monthly quarterly annual upfront"`
	IsPilot         bool      `gorm:"default:false" json:"isPilot"`
	CreatedBy       uint      `gorm:"not null" json:"createdBy"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// Invoice represents an invoice for a contract
type Invoice struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	ContractID   uint      `gorm:"not null" json:"contractId" validate:"required"`
	Contract     Contract  `gorm:"foreignKey:ContractID" json:"contract,omitempty"`
	Amount       int64     `gorm:"not null" json:"amount" validate:"required,min=1"`
	InvoiceDate  time.Time `gorm:"not null" json:"invoiceDate" validate:"required"`
	RevenueType  string    `gorm:"not null" json:"revenueType" validate:"required,oneof=recurring non-recurring service"`
	TabsInvoiceID string   `json:"tabsInvoiceId,omitempty"`
	SyncDetails  string    `json:"syncDetails,omitempty"`
	CreatedBy    uint      `gorm:"not null" json:"createdBy"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// Commission represents a commission calculation
type Commission struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	InvoiceID         uint      `gorm:"not null" json:"invoiceId"`
	Invoice           Invoice   `gorm:"foreignKey:InvoiceID" json:"invoice,omitempty"`
	AEID              uint      `gorm:"not null" json:"aeId"`
	AE                User      `gorm:"foreignKey:AEID" json:"ae,omitempty"`
	BaseCommission    int64     `gorm:"not null" json:"baseCommission"`
	PilotBonus        int64     `gorm:"default:0" json:"pilotBonus"`
	MultiYearBonus    int64     `gorm:"default:0" json:"multiYearBonus"`
	UpfrontBonus      int64     `gorm:"default:0" json:"upfrontBonus"`
	TotalCommission   int64     `gorm:"not null" json:"totalCommission"`
	Status            string    `gorm:"not null;default:pending" json:"status" validate:"oneof=pending approved rejected paid"`
	ApprovedBy        *uint     `json:"approvedBy,omitempty"`
	ApprovedAt        *time.Time `json:"approvedAt,omitempty"`
	RejectionReason   string    `json:"rejectionReason,omitempty"`
	OTECapApplied     bool      `gorm:"default:false" json:"oteCapApplied"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// CommissionConfig represents commission configuration
type CommissionConfig struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Name             string    `gorm:"not null" json:"name" validate:"required"`
	Description      string    `json:"description"`
	BaseRate         float64   `gorm:"not null" json:"baseRate" validate:"required,min=0,max=1"`
	PilotBonusRate   float64   `gorm:"default:0" json:"pilotBonusRate" validate:"min=0,max=1"`
	MultiYearBonusRate float64 `gorm:"default:0" json:"multiYearBonusRate" validate:"min=0,max=1"`
	UpfrontBonusRate float64   `gorm:"default:0" json:"upfrontBonusRate" validate:"min=0,max=1"`
	OTECap           int64     `gorm:"default:0" json:"oteCap" validate:"min=0"`
	DeceleratorRate  float64   `gorm:"default:1" json:"deceleratorRate" validate:"min=0,max=1"`
	IsActive         bool      `gorm:"default:true" json:"isActive"`
	CreatedBy        uint      `gorm:"not null" json:"createdBy"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// AECommissionAssignment represents the assignment of commission config to AE
type AECommissionAssignment struct {
	ID                 uint              `gorm:"primaryKey" json:"id"`
	AEID               uint              `gorm:"not null" json:"aeId"`
	AE                 User              `gorm:"foreignKey:AEID" json:"ae,omitempty"`
	CommissionConfigID uint              `gorm:"not null" json:"commissionConfigId"`
	CommissionConfig   CommissionConfig  `gorm:"foreignKey:CommissionConfigID" json:"commissionConfig,omitempty"`
	StartDate          time.Time         `gorm:"not null" json:"startDate"`
	EndDate            *time.Time        `json:"endDate,omitempty"`
	CreatedBy          uint              `gorm:"not null" json:"createdBy"`
	CreatedAt          time.Time         `json:"createdAt"`
	UpdatedAt          time.Time         `json:"updatedAt"`
}

// Invitation represents user invitations
type Invitation struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Email     string    `gorm:"not null" json:"email" validate:"required,email"`
	Token     string    `gorm:"not null;unique" json:"token"`
	Role      string    `gorm:"not null" json:"role" validate:"required,oneof=admin ae"`
	ExpiresAt time.Time `gorm:"not null" json:"expiresAt"`
	CreatedBy uint      `gorm:"not null" json:"createdBy"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Request/Response DTOs
type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Name     string `json:"name" validate:"required"`
	Password string `json:"password" validate:"required,min=6"`
	Role     string `json:"role" validate:"required,oneof=admin ae"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type CreateContractRequest struct {
	ClientName     string `json:"clientName" validate:"required"`
	AEID           uint   `json:"aeId" validate:"required"`
	ContractValue  int64  `json:"contractValue" validate:"required,min=1"`
	ACV            int64  `json:"acv" validate:"required,min=1"`
	ContractType   string `json:"contractType" validate:"required,oneof=new renewal upsell"`
	ContractLength int    `json:"contractLength" validate:"required,min=1"`
	PaymentTerms   string `json:"paymentTerms" validate:"required,oneof=monthly quarterly annual upfront"`
	IsPilot        bool   `json:"isPilot"`
}

type CreateInvoiceRequest struct {
	ContractID  uint   `json:"contractId" validate:"required"`
	Amount      int64  `json:"amount" validate:"required,min=1"`
	InvoiceDate string `json:"invoiceDate" validate:"required"`
	RevenueType string `json:"revenueType" validate:"required,oneof=recurring non-recurring service"`
}

type UpdateCommissionStatusRequest struct {
	Status          string `json:"status" validate:"required,oneof=approved rejected paid"`
	RejectionReason string `json:"rejectionReason,omitempty"`
}

type CreateCommissionConfigRequest struct {
	Name               string  `json:"name" validate:"required"`
	Description        string  `json:"description"`
	BaseRate           float64 `json:"baseRate" validate:"required,min=0,max=1"`
	PilotBonusRate     float64 `json:"pilotBonusRate" validate:"min=0,max=1"`
	MultiYearBonusRate float64 `json:"multiYearBonusRate" validate:"min=0,max=1"`
	UpfrontBonusRate   float64 `json:"upfrontBonusRate" validate:"min=0,max=1"`
	OTECap             int64   `json:"oteCap" validate:"min=0"`
	DeceleratorRate    float64 `json:"deceleratorRate" validate:"min=0,max=1"`
	IsActive           bool    `json:"isActive"`
}

type AssignCommissionConfigRequest struct {
	AEID               uint   `json:"aeId" validate:"required"`
	CommissionConfigID uint   `json:"commissionConfigId" validate:"required"`
	StartDate          string `json:"startDate" validate:"required"`
	EndDate            string `json:"endDate,omitempty"`
}