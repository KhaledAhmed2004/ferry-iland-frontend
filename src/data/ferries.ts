export interface FerryTrip {
  id: string;
  operator: string;
  vesselName: string;
  vesselType: string;
  image: string;
  departureTime: string;
  departurePort: string;
  arrivalTime: string;
  arrivalPort: string;
  duration: string;
  price: number;
  availableSeats: number;
  featured?: boolean;
}
