import { getDistrict, evaluateRoom } from './config.js';

let currentImageIndex = 0;
let activeImages = [];

// Hiển thị danh sách phòng trọ bên cột trái
export function renderRoomsList(rooms, activeIndex, currentPage, itemsPerPage, onSelectRoom) {
    const listDiv = document.getElementById('room-list');
    const paginationDiv = document.getElementById('pagination-controls');
    listDiv.innerHTML = "";
    paginationDiv.innerHTML = "";

    if (rooms.length === 0) {
        listDiv.innerHTML = "<p class='text-center py-4 text-muted small'>Không có phòng phù hợp.</p>";
        document.getElementById('room-detail').innerHTML = `<p class="text-center text-muted my-5">Chọn một phòng để xem chi tiết.</p>`;
        return;
    }

    const totalPages = Math.ceil(rooms.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = rooms.slice(startIndex, startIndex + itemsPerPage);

    paginated.forEach(room => {
        // Tự động tính toán lại chi phí & điểm đánh giá tức thời tại Frontend
        const { splitCost, priority } = evaluateRoom(room);
        const coverImage = room.image1 || room.image2 || room.image3 || "https://via.placeholder.com/150x110?text=Chua+Co+Anh";

        let statusColor = "bg-secondary";
        if (room.status.includes("Mới.thoáng") || room.status.includes("Ưng ý")) statusColor = "bg-success";
        if (room.status.includes("Mới.bí.khépkín")) statusColor = "bg-warning text-dark";
        if (room.status.includes("Cũ.bí.khép kín")) statusColor = "bg-dark text-white";
        if (room.status.includes("Loại")) statusColor = "bg-danger";
        if (room.status.includes("Đã xem")) statusColor = "bg-info text-dark";
        if (room.status.includes("Đã cọc")) statusColor = "bg-primary";

        const isSelected = room.originalIndex === activeIndex;
        const activeClass = isSelected ? 'room-active shadow-sm border-primary' : 'border-light-subtle';

        const itemHtml = `
            <div class="room-list-item card flex-row p-2 align-items-center border-2 ${activeClass}" 
                 id="room-item-${room.originalIndex}">
                 
                <div class="me-2 px-1" onclick="event.stopPropagation()">
                    <input type="checkbox" class="form-check-input bulk-select-checkbox" data-index="${room.originalIndex}">
                </div>

                <div class="rounded overflow-hidden flex-shrink-0 bg-light position-relative" style="width: 100px; height: 75px;">
                    <img src="${coverImage}" class="w-100 h-100" style="object-fit: cover;" alt="thumbnail">
                    <span class="badge ${statusColor} position-absolute bottom-0 start-0 m-1" style="font-size: 0.65rem;">${room.status}</span>
                </div>

                <div class="ms-3 flex-grow-1 min-w-0" style="overflow: hidden;">
                    <div class="d-flex align-items-center justify-content-between">
                        <h6 class="text-danger fw-bold mb-0 text-truncate">${room.price}k VNĐ</h6>
                        <span class="star-rating text-truncate">${priority}</span>
                    </div>
                    <div class="text-muted small text-truncate" style="font-size: 0.8rem;">${room.address}</div>
                    <div class="d-flex align-items-center justify-content-between mt-1">
                        <span class="badge bg-light text-dark" style="font-size: 0.7rem;">${room.distance} km</span>
                        <span class="split-price" style="font-size: 0.7rem;">Chia đôi: ${splitCost}k</span>
                    </div>
                </div>
            </div>
        `;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = itemHtml;
        const element = tempDiv.firstElementChild;
        element.addEventListener('click', () => onSelectRoom(room.originalIndex));
        listDiv.appendChild(element);
    });

    // Cấu hình lại class căn trái (justify-content-start) và tạo khoảng đệm lề trái (px-3)
paginationDiv.className = "d-flex align-items-center justify-content-end gap-2 mt-3 py-1 px-3 border-top bg-white rounded shadow-sm";

    // Vẽ phân trang 
paginationDiv.innerHTML = `
    <button type="button" class="btn btn-outline-secondary" id="btn-prev-page" style="padding: 2px 6px; font-size: 0.7rem; border-radius: 4px;" ${currentPage === 1 ? 'disabled' : ''}>◀</button>
    <span class="fw-bold" style="font-size: 0.75rem; color: #6c757d; min-width: 60px; text-align: center;">Trang ${currentPage}/${totalPages}</span>
    <button type="button" class="btn btn-outline-secondary" id="btn-next-page" style="padding: 2px 6px; font-size: 0.7rem; border-radius: 4px;" ${currentPage === totalPages ? 'disabled' : ''}>▶</button>
`;
}

// Hiển thị khung chi tiết phòng trọ ở cột phải
export function renderDetailPane(room, index, onBackToList) {
    const detailDiv = document.getElementById('room-detail');
    if (!room) return;

    // Chuyển dịch toàn bộ ảnh
    currentImageIndex = 0;
    activeImages = [room.image1, room.image2, room.image3].filter(url => url && url.trim() !== "");
    if (activeImages.length === 0) {
        activeImages = ["https://via.placeholder.com/600x400?text=Chua+Co+Anh"];
    }

    // Tính toán chi tiết thời gian thực
    const { totalCost, splitCost, priority } = evaluateRoom(room);

    let carouselHtml = `
        <div class="position-relative carousel-img-container rounded overflow-hidden mb-2" style="height: 280px;">
            <img id="detail-carousel-img" src="${activeImages[currentImageIndex]}" class="w-100 h-100" style="object-fit: contain; display: block;" alt="preview">
    `;
    
    if (activeImages.length > 1) {
        carouselHtml += `
            <button type="button" class="carousel-btn position-absolute top-50 start-0 translate-middle-y ms-2" id="btn-carousel-prev">◀</button>
            <button type="button" class="carousel-btn position-absolute top-50 end-0 translate-middle-y me-2" id="btn-carousel-next">▶</button>
            <div class="position-absolute bottom-0 start-50 translate-middle-x mb-2 d-flex gap-1" id="carousel-dots">
        `;
        activeImages.forEach((_, i) => {
            const dotColor = i === currentImageIndex ? '#0d6efd' : '#cccccc';
            carouselHtml += `<span class="dot-indicator" style="width: 8px; height: 8px; border-radius: 50%; display: inline-block; background-color: ${dotColor};"></span>`;
        });
        carouselHtml += `</div>`;
    }
    carouselHtml += `</div>`;

    let statusColor = "bg-secondary";
    if (room.status.includes("Mới.thoáng") || room.status.includes("Ưng ý")) statusColor = "bg-success";
    if (room.status.includes("Mới.bí.khépkín")) statusColor = "bg-warning text-dark";
    if (room.status.includes("Cũ.bí.khép kín")) statusColor = "bg-dark text-white";
    if (room.status.includes("Loại")) statusColor = "bg-danger";
    if (room.status.includes("Đã xem")) statusColor = "bg-info text-dark";
    if (room.status.includes("Đã cọc")) statusColor = "bg-primary";

    detailDiv.innerHTML = `
        <!-- Nút Quay lại dành cho giao diện di động -->
        <button type="button" class="btn btn-outline-secondary btn-sm d-lg-none mb-3" id="btn-mobile-back">⬅ Quay lại danh sách</button>

        ${carouselHtml}
        <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
                <h4 class="text-danger mb-1 fw-bold">${room.price}k VNĐ/tháng</h4>
                <div class="text-muted small">${formatTextWithLinks(room.address)}</div>
            </div>
            <span class="badge ${statusColor} fs-6">${room.status}</span>
        </div>

        <div class="row g-2 mb-3 text-center">
            <div class="col-6">
                <div class="p-2 border rounded bg-light">
                    <div class="text-muted small">Mức độ Ưu tiên</div>
                    <div class="star-rating">${priority}</div>
                </div>
            </div>
            <div class="col-6">
                <div class="p-2 border rounded bg-light">
                    <div class="text-muted small">Khoảng cách</div>
                    <div class="fw-bold text-primary">${room.distance} km</div>
                </div>
            </div>
        </div>

        <h6 class="border-bottom pb-2 mb-2 fw-bold text-secondary">Chi phí dịch vụ dự kiến</h6>
        <div class="row g-2 mb-3 text-sm" style="font-size: 0.9rem;">
            <div class="col-6">⚡ Điện: <strong>${room.elecPrice || 4}k/số</strong> | Ước lượng: <strong>${room.estElec || 150} số</strong></div>
            <div class="col-6">💧 Nước: <strong>${room.waterPrice || 100}k/người</strong></div>
            <div class="col-6">📶 Mạng/Wifi: <strong>${room.wifiPrice || 100}k/phòng</strong></div>
            <div class="col-6">🛠️ Dịch vụ: <strong>${room.servicePrice || 100}k/người</strong></div>
        </div>

        <div class="p-3 bg-light rounded border mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="text-muted small">Tổng cộng chi phí thực:</span>
                <span class="fs-5 fw-bold text-dark">${totalCost}k</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <span class="text-muted small">Mỗi người:</span>
                <span class="split-price">Chia đôi: ${splitCost}k/người</span>
            </div>
        </div>

        <div class="mb-1">
            <h6 class="fw-bold text-secondary mb-1">Mô tả phòng:</h6>
            <p class="small text-slate-700 bg-light p-2 border rounded" style="white-space: pre-wrap;">${formatTextWithLinks(room.details) || 'Không có ghi chú mô tả'}</p>
            <h6 class="fw-bold text-secondary mb-1 mt-2">Liên hệ:</h6>
            <p class="small text-slate-700 bg-light p-2 border rounded" style="white-space: pre-wrap;">${formatTextWithLinks(room.contact) || 'Không có thông tin liên lạc'}</p>
        </div>
    `;

    // Lắng nghe sự kiện cho các nút điều khiển trong Detail Pane
    if (document.getElementById('btn-carousel-prev')) {
        document.getElementById('btn-carousel-prev').addEventListener('click', prevImage);
    }
    if (document.getElementById('btn-carousel-next')) {
        document.getElementById('btn-carousel-next').addEventListener('click', nextImage);
    }
    if (document.getElementById('btn-mobile-back')) {
        document.getElementById('btn-mobile-back').addEventListener('click', onBackToList);
    }
}

function prevImage(e) {
    e.stopPropagation();
    if (activeImages.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + activeImages.length) % activeImages.length;
    updateCarousel();
}

function nextImage(e) {
    e.stopPropagation();
    if (activeImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % activeImages.length;
    updateCarousel();
}

function updateCarousel() {
    document.getElementById('detail-carousel-img').src = activeImages[currentImageIndex];
    const dots = document.querySelectorAll('#carousel-dots .dot-indicator');
    dots.forEach((dot, i) => {
        dot.style.backgroundColor = (i === currentImageIndex) ? '#0d6efd' : '#cccccc';
    });
}
// Hàm tự động phát hiện liên kết URL và chuyển đổi thành thẻ <a> bấm được
function formatTextWithLinks(text) {
    if (!text) return "";
    const urlPattern = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary text-decoration-underline">$1</a>');
}
