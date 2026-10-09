import axios from "axios";

export const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

export const API_PATHS = {
  AUTH: {
    LOGIN: "/auth/zalo",
    MOCK_LOGIN: "/auth/mock",
    PROFILE: "/auth/me",
  },
  DESTINATIONS: {
    GET_ALL: "/destinations",
    GET_BY_ID: (id: string) => `/destinations/${id}`,
  },
  TOURS: {
    GET_ALL: "/tours",
    GET_BY_ID: (id: string) => `/tours/${id}`,
    REVIEWS: (id: string) => `/tours/${id}/reviews`,
    REVIEW_ELIGIBILITY: (id: string) => `/tours/${id}/reviews/eligibility`,
  },
  REVIEWS: {
    GET_BY_ID: (id: string) => `/reviews/${id}`,
  },
  DEPARTURES: {
    GET_ALL: "/departures",
  },
  COUPONS: {
    AVAILABLE: "/coupons/available",
  },
  BOOKINGS: {
    GET_ALL: "/bookings",
    GET_MINE: "/bookings/mine",
    GET_BY_ID: (id: string) => `/bookings/${id}`,
    CREATE: "/bookings",
    CANCEL: (id: string) => `/bookings/${id}/cancel`,
  },
  UPLOAD: {
    IMAGE: "/upload",
  },
  PAYMENTS: {
    ZALOPAY_QUERY: (appTransId: string) =>
      `/payments/zalopay/${encodeURIComponent(appTransId)}/query`,
  },
};

export const buildApiUrl = (path: string) => `${BASE_URL}/api${path}`;

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
});

export function setApiToken(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (typeof error.response?.data?.message === "string")
      return error.response.data.message;
    if (!error.response)
      return "Chưa kết nối được với VNA. Kiểm tra kết nối rồi thử lại.";
  }
  return "Chưa thực hiện được thao tác này. Vui lòng thử lại.";
}
