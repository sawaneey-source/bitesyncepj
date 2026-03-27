const getBase = () => {
    if (typeof window !== 'undefined') {
        const { hostname } = window.location;
        return `http://${hostname}/bitesync`;
    }
    return 'http://localhost/bitesync';
};

export const BASE_URL = getBase();
export const API_BASE = `${BASE_URL}/api`;
export const PUBLIC_URL = `${BASE_URL}/public`;
