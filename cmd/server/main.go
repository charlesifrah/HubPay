package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"hubpay/internal/auth"
	"hubpay/internal/config"
	"hubpay/internal/database"
	"hubpay/internal/handlers"
	"hubpay/internal/middleware"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize configuration
	cfg := config.New()

	// Initialize database
	db, err := database.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run migrations
	if err := database.Migrate(db); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Initialize router
	router := gin.Default()

	// Setup middleware
	router.Use(middleware.CORS())
	router.Use(middleware.Sessions(cfg.SessionSecret, db))

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, cfg)
	userHandler := handlers.NewUserHandler(db)
	contractHandler := handlers.NewContractHandler(db)
	invoiceHandler := handlers.NewInvoiceHandler(db)
	commissionHandler := handlers.NewCommissionHandler(db)
	adminHandler := handlers.NewAdminHandler(db)

	// Setup routes
	setupRoutes(router, authHandler, userHandler, contractHandler, invoiceHandler, commissionHandler, adminHandler)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func setupRoutes(
	router *gin.Engine,
	authHandler *handlers.AuthHandler,
	userHandler *handlers.UserHandler,
	contractHandler *handlers.ContractHandler,
	invoiceHandler *handlers.InvoiceHandler,
	commissionHandler *handlers.CommissionHandler,
	adminHandler *handlers.AdminHandler,
) {
	api := router.Group("/api")

	// Authentication routes
	api.POST("/register", authHandler.Register)
	api.POST("/login", authHandler.Login)
	api.POST("/logout", authHandler.Logout)
	api.GET("/user", authHandler.GetCurrentUser)

	// Protected routes
	protected := api.Group("/")
	protected.Use(middleware.RequireAuth())

	// User routes
	protected.GET("/users", userHandler.GetUsers)
	protected.GET("/aes", userHandler.GetAEs)

	// Contract routes
	protected.GET("/contracts", contractHandler.GetContracts)
	protected.POST("/contracts", contractHandler.CreateContract)
	protected.DELETE("/contracts/:id", contractHandler.DeleteContract)

	// Invoice routes
	protected.GET("/invoices", invoiceHandler.GetInvoices)
	protected.POST("/invoices", invoiceHandler.CreateInvoice)

	// Commission routes
	protected.GET("/commissions", commissionHandler.GetCommissions)
	protected.PUT("/commissions/:id/status", commissionHandler.UpdateCommissionStatus)

	// Admin only routes
	admin := protected.Group("/admin")
	admin.Use(middleware.RequireAdmin())

	admin.GET("/dashboard", adminHandler.GetDashboard)
	admin.GET("/approvals", adminHandler.GetPendingApprovals)
	admin.GET("/payouts", adminHandler.GetPayouts)
	admin.POST("/clear-database", adminHandler.ClearDatabase)

	// Commission configuration routes
	admin.GET("/commission-configs", adminHandler.GetCommissionConfigs)
	admin.POST("/commission-configs", adminHandler.CreateCommissionConfig)
	admin.GET("/commission-configs/:id", adminHandler.GetCommissionConfig)
	admin.PUT("/commission-configs/:id", adminHandler.UpdateCommissionConfig)
	admin.DELETE("/commission-configs/:id", adminHandler.DeleteCommissionConfig)

	// AE commission assignment routes
	admin.POST("/ae-commission-assignments", adminHandler.AssignCommissionConfig)
	admin.GET("/ae-commission-assignments/:aeId", adminHandler.GetCommissionAssignmentsForAE)
	admin.GET("/ae-commission-assignments", adminHandler.GetAllCommissionAssignments)

	// AE routes
	ae := protected.Group("/ae")
	ae.GET("/commission-config", commissionHandler.GetAECommissionConfig)

	// Tabs API integration
	protected.GET("/tabs/invoices/paid", invoiceHandler.GetTabsInvoices)

	// Serve static files for production
	router.Static("/assets", "./dist/public/assets")
	router.StaticFile("/", "./dist/public/index.html")
	router.NoRoute(func(c *gin.Context) {
		c.File("./dist/public/index.html")
	})
}