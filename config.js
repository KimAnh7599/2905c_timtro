export const API_URL = "https://script.google.com/macros/s/AKfycbyUMcd3p8x26aSZdxr2OqjeXZF0cVFwBbiHsaK0bDU05FBy4kteUvdH0anf3deZ85E/exec";   
export const WORKER_UPLOAD_URL = "https://timtro-upload-api.vuilongchomixtape.workers.dev";

export const DEFAULTS = {
    elecPrice: 4,      
    waterPrice: 100,   
    wifiPrice: 100,    
    servicePrice: 100, 
    estElec: 150       
};

// Hàm chuyển đổi định dạng ngày giờ "dd/MM/yyyy HH:mm:ss" sang đối tượng Date để sắp xếp
export function parseTimestamp(tsStr) {
    if (!tsStr) return new Date(0);
    const parts = tsStr.split(" ");
    if (parts.length < 2) return new Date(0);
    
    const dateParts = parts[0].split("/");
    const timeParts = parts[1].split(":");
    if (dateParts.length < 3 || timeParts.length < 3) return new Date(0);

    return new Date(
        parseInt(dateParts[2]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[0]),
        parseInt(timeParts[0]),
        parseInt(timeParts[1]),
        parseInt(timeParts[2])
    );
}

// Hàm tính toán chi tiết chi phí và chấm điểm sao P/Y hoàn toàn ở client
export function evaluateRoom(room) {
    const price = parseFloat(room.price) || 0;
    const elecPrice = parseFloat(room.elecPrice) || DEFAULTS.elecPrice;
    const estElec = parseFloat(room.estElec) || DEFAULTS.estElec;
    const waterPrice = parseFloat(room.waterPrice) || DEFAULTS.waterPrice;
    const wifiPrice = parseFloat(room.wifiPrice) || DEFAULTS.wifiPrice;
    const servicePrice = parseFloat(room.servicePrice) || DEFAULTS.servicePrice;
    const distance = parseFloat(room.distance) || 0;

    // Tính tổng chi phí dịch vụ thực tế
    const fixedUtilityCosts = (elecPrice * estElec) 
                              + (waterPrice * 2) 
                              + wifiPrice 
                              + (servicePrice * 2);

    const totalCost = Math.round(price + fixedUtilityCosts);
    const splitCost = Math.round(totalCost / 2); // Chia đều mặc định

    // Công thức tính điểm P/Y
    const phi_an = distance > 5 ? 100 : 0;
    const tong_danh_gia = splitCost + phi_an;

    let priority = "☆☆☆☆☆";
    if (price > 0) {
        if (tong_danh_gia <= 1650) priority = "★★★★★";
        else if (tong_danh_gia <= 1800) priority = "★★★★☆";
        else if (tong_danh_gia <= 1950) priority = "★★★☆☆";
        else if (tong_danh_gia <= 2100) priority = "★★☆☆☆";
        else if (tong_danh_gia <= 2250) priority = "★☆☆☆☆";
    }

    return { totalCost, splitCost, priority };
}

// Phân loại khu vực tự động theo từ khóa trong địa chỉ
export function getDistrict(address) {
    const addr = (address || "").toLowerCase();
    if (addr.includes("cầu giấy") || addr.includes("dịch vọng") || addr.includes("mai dịch") || addr.includes("nghĩa đô") || addr.includes("cầu diễn") || addr.includes("hồ tùng mậu")) {
        return "Cầu Giấy";
    }
    if (addr.includes("mễ trì") || addr.includes("từ liêm") || addr.includes("mỹ đình") || addr.includes("trung văn") || addr.includes("đại mỗ") || addr.includes("mễ trì thượng")) {
        return "Nam Từ Liêm";
    }
    return "Khác";
}