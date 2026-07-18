export interface IBankDetails {
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
}

export interface ILocation {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface TSupportingDocuments {
  govtId: string | null; // Cloudinary secure_url
  drivingLicense: string | null;
  vehicleInsurance: string | null;
}
