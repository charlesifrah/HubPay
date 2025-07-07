package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"hubpay/internal/models"
)

type UserHandler struct {
	db *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{db: db}
}

func (h *UserHandler) GetUsers(c *gin.Context) {
	var users []models.User
	if err := h.db.Select("id, email, name, role, created_at, updated_at").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	c.JSON(http.StatusOK, users)
}

func (h *UserHandler) GetAEs(c *gin.Context) {
	var aes []models.User
	if err := h.db.Select("id, email, name, role, created_at, updated_at").Where("role = ?", "ae").Find(&aes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch AEs"})
		return
	}

	c.JSON(http.StatusOK, aes)
}