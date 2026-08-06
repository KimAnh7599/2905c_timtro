import { API_URL, WORKER_UPLOAD_URL } from './config.js';

export async function fetchRoomsData() {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Không thể kết nối máy chủ dữ liệu");
    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message);
    return result.data;
}

export async function saveRoomData(payload) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
    });
    if (!response.ok) throw new Error("Kết nối API thất bại");
    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message);
    return result;
}

export async function uploadImageFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(WORKER_UPLOAD_URL, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) throw new Error("Tải ảnh thất bại");
    const result = await response.json();
    if (!result.url) throw new Error("Không nhận được URL ảnh từ server");
    return result.url;
}
