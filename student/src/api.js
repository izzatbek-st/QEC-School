export const API_URL = `${import.meta.env.VITE_API_URL || '/api'}`.replace(/\/$/, '');

export const apiFetch = (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    const user = localStorage.getItem('student_user');
    if (user) {
        try {
            const token = JSON.parse(user).access_token;
            if (token) headers.set('Authorization', `Bearer ${token}`);
        } catch {
            localStorage.removeItem('student_user');
        }
    }
    return fetch(url, { ...options, headers }).then((response) => {
        if (response.status === 401 && !url.includes('/auth/login')) {
            localStorage.removeItem('student_user');
            window.location.assign('/student/login');
        }
        return response;
    });
};

export const getStudentId = () => {
    const user = localStorage.getItem('student_user');
    if (user) {
        return JSON.parse(user).id;
    }
    return null;
};
