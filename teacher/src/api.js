const API_BASE_URL = `${import.meta.env.VITE_API_URL || '/api'}`.replace(/\/$/, '');
export const API_URL = `${API_BASE_URL}/teacher`;

export const apiFetch = (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    const user = localStorage.getItem('teacher_user');
    if (user) {
        try {
            const token = JSON.parse(user).access_token;
            if (token) headers.set('Authorization', `Bearer ${token}`);
        } catch {
            localStorage.removeItem('teacher_user');
        }
    }
    return fetch(url, { ...options, headers }).then((response) => {
        if (response.status === 401 && !url.includes('/auth/login')) {
            localStorage.removeItem('teacher_user');
            window.location.assign('/teacher/login');
        }
        return response;
    });
};
