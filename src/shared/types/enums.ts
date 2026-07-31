export enum ApplicationCharges {
  SERVICE_CHARGES = 2000,
  COMMISSION_RATE = 0.17,
}

export enum RiderStatus {
  PENDING_APPROVAL = "pending_approval",
  ACTIVE = "active",
  SUSPENDED = "suspended",
}

export enum AvailabilityStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  BUSY = "busy",
}

export enum VehicleType {
  BICYCLE = "bicycle",
  MOTORBIKE = "motorbike",
  SCOOTER = "scooter",
}

export enum UserRole {
  CUSTOMER = "customer",
  VENDOR = "vendor",
  RIDER = "rider",
  ADMIN = "admin",
}

export enum DispatchStatus {
  NOT_STARTED = "not_started",
  SEARCHING = "searching",
  EXPANDING_RADIUS = "expanding_radius",
  RIDER_ASSIGNED = "rider_assigned",
  FAILED = "failed",
}
