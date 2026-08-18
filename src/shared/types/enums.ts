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

/* // enums.ts

export enum DispatchStatus {
    CREATED = "CREATED",
    SEARCHING = "SEARCHING",
    ASSIGNED = "ASSIGNED",
    FAILED = "FAILED",
}

export enum DispatchAttemptStatus {
    SEARCHING = "SEARCHING",
    COMPLETED = "COMPLETED",
}

export enum RiderOfferStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    DECLINED = "DECLINED",
    EXPIRED = "EXPIRED",
    CANCELLED = "CANCELLED",
} */

export enum DispatchStatus {
  CREATED = "CREATED",

  SEARCHING = "SEARCHING",

  ASSIGNED = "ASSIGNED",

  COMPLETED = "COMPLETED",

  FAILED = "FAILED",

  CANCELLED = "CANCELLED",
}

export enum DispatchAttemptStatus {
  SEARCHING = "SEARCHING",

  COMPLETED = "COMPLETED",

  EXHAUSTED = "EXHAUSTED",

  CANCELLED = "CANCELLED",
}

export enum RiderOfferStatus {
  PENDING = "PENDING",

  ACCEPTED = "ACCEPTED",

  DECLINED = "DECLINED",

  EXPIRED = "EXPIRED",

  CANCELLED = "CANCELLED",
}
