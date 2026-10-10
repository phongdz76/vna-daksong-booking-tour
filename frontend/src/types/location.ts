export type PlaceGroup = "nature" | "culture" | "rest" | "pickup";
export type AreaScope = "daksong" | "nearby" | "unspecified";
export interface Coordinates { latitude: number; longitude: number }
export interface PlaceLocation {
  _id: string;
  name: string;
  address: string;
  locality?: string;
  placeGroup?: PlaceGroup;
  areaScope?: AreaScope;
  coordinates?: Coordinates | null;
}
