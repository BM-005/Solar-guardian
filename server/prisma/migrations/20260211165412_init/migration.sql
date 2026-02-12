-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SolarPanel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "panelId" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "column" INTEGER NOT NULL,
    "zoneId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "efficiency" REAL NOT NULL,
    "currentOutput" REAL NOT NULL,
    "maxOutput" REAL NOT NULL,
    "temperature" REAL NOT NULL,
    "lastChecked" DATETIME NOT NULL,
    "installDate" DATETIME NOT NULL,
    "inverterGroup" TEXT NOT NULL,
    "stringId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SolarPanel_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "avatar" TEXT,
    "status" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "certifications" TEXT NOT NULL,
    "activeTickets" INTEGER NOT NULL DEFAULT 0,
    "resolvedTickets" INTEGER NOT NULL DEFAULT 0,
    "avgResolutionTime" REAL NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FaultDetection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "panelId" TEXT NOT NULL,
    "detectedAt" DATETIME NOT NULL,
    "severity" TEXT NOT NULL,
    "faultType" TEXT NOT NULL,
    "droneImageUrl" TEXT,
    "thermalImageUrl" TEXT,
    "aiConfidence" REAL NOT NULL,
    "aiAnalysis" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "locationX" REAL NOT NULL,
    "locationY" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FaultDetection_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "SolarPanel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketNumber" TEXT NOT NULL,
    "panelId" TEXT,
    "faultId" TEXT,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    "assignedTechnicianId" TEXT,
    "description" TEXT NOT NULL,
    "faultType" TEXT NOT NULL,
    "droneImageUrl" TEXT,
    "thermalImageUrl" TEXT,
    "aiAnalysis" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "resolutionNotes" TEXT,
    "resolutionCause" TEXT,
    "resolutionImageUrl" TEXT,
    CONSTRAINT "Ticket_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "SolarPanel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_faultId_fkey" FOREIGN KEY ("faultId") REFERENCES "FaultDetection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeatherData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "temperature" REAL NOT NULL,
    "condition" TEXT NOT NULL,
    "humidity" REAL NOT NULL,
    "sunlightIntensity" REAL NOT NULL,
    "recordedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PowerGeneration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL,
    "value" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Zone_name_key" ON "Zone"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SolarPanel_panelId_key" ON "SolarPanel"("panelId");

-- CreateIndex
CREATE INDEX "SolarPanel_zoneId_idx" ON "SolarPanel"("zoneId");

-- CreateIndex
CREATE INDEX "SolarPanel_status_idx" ON "SolarPanel"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_email_key" ON "Technician"("email");

-- CreateIndex
CREATE INDEX "FaultDetection_panelId_idx" ON "FaultDetection"("panelId");

-- CreateIndex
CREATE INDEX "FaultDetection_severity_idx" ON "FaultDetection"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_priority_idx" ON "Ticket"("priority");

-- CreateIndex
CREATE INDEX "Ticket_assignedTechnicianId_idx" ON "Ticket"("assignedTechnicianId");

-- CreateIndex
CREATE INDEX "TicketNote_ticketId_idx" ON "TicketNote"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherData_recordedAt_key" ON "WeatherData"("recordedAt");

-- CreateIndex
CREATE INDEX "WeatherData_recordedAt_idx" ON "WeatherData"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "PowerGeneration_timestamp_idx" ON "PowerGeneration"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "PowerGeneration_timestamp_key" ON "PowerGeneration"("timestamp");
