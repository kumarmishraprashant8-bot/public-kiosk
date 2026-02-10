export interface GeoLocation {
    latitude: number;
    longitude: number;
    accuracy: number;
}

export const getCurrentLocation = (): Promise<GeoLocation> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser"));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
            }
        );
    });
};

export const getWardFromCoords = (lat: number, _lon: number): string => {
    // Mock Ward Mapping for Demo
    // In reality, this would use a point-in-polygon algorithm with KML/GeoJSON files

    if (lat > 12.97) return "Ward 101 - MG Road";
    if (lat < 12.95) return "Ward 45 - Jayanagar";
    return "Ward 12 - Indiranagar";
};
