import { DEFAULTS, parseTimestamp, evaluateRoom, getDistrict } from './config.js';
import { fetchRoomsData, saveRoomData, uploadImageFile } from './api.js';
import { renderRoomsList, renderDetailPane } from './ui.js';

let globalRooms = [];
let selectedRoomIndex = 0;
let currentPage = 1;
const itemsPerPage = 8;

let filterDistrict = "Tất cả";
let filterStatus = "Tất cả";

// Bắt đầu khởi động ứng dụng khi trang đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    setupEventListeners();
    await loadRooms();
}

// Đồng bộ dữ liệu mới nhất từ GAS
async function loadRooms() {
    document.getElementById('loading').style.display = 'block';
    try {
        const rawRooms = await fetchRoomsData();
        
        // SẮP XẾP TRƯỚC: Sử dụng JavaScript để thực thi sắp xếp đa tầng trước khi render (Mới nhất lên đầu)
        globalRooms = rawRooms.map((room, idx) => ({ ...room, originalIndex: idx }));
        globalRooms.sort((a, b) => {
            const dateA = parseTimestamp(a.timestamp);
            const dateB = parseTimestamp(b.timestamp);
            return dateB - dateA; 
        });

        updateDistrictBadgeCounts();
        applyFiltersAndRender();
    } catch (err) {
        document.getElementById('loading').innerHTML = `<p class="text-danger small">Lỗi đồng bộ: ${err.message}</p>`;
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Cập nhật số đếm thống kê tại các nút Lọc khu vực
function updateDistrictBadgeCounts() {
    let countCG = 0;
    let countNTL = 0;
    globalRooms.forEach(room => {
        const dist = getDistrict(room.address);
        if (dist === "Cầu Giấy") countCG++;
        if (dist === "Nam Từ Liêm") countNTL++;
    });
    
    document.getElementById('filter-all-dist').innerText = `Tất cả (${globalRooms.length})`;
    document.getElementById('filter-cg').innerText = `Cầu Giấy (${countCG})`;
    document.getElementById('filter-ntl').innerText = `Nam Từ Liêm (${countNTL})`;
}

// Áp dụng bộ lọc
function applyFiltersAndRender() {
    let filtered = [...globalRooms];

    if (filterDistrict !== "Tất cả") {
        filtered = filtered.filter(room => getDistrict(room.address) === filterDistrict);
    }
    if (filterStatus !== "Tất cả") {
        filtered = filtered.filter(room => room.status === filterStatus);
    }

    renderRoomsList(filtered, selectedRoomIndex, currentPage, itemsPerPage, (idx) => {
        selectedRoomIndex = idx;
        const room = globalRooms[idx];
        
        // Hiển thị chi tiết và chuyển đổi Layout trên thiết bị di động
        renderDetailPane(room, idx, () => {
            document.getElementById('app-container').classList.remove('mobile-detail-active');
        });
        
        document.getElementById('app-container').classList.add('mobile-detail-active');
        applyFiltersAndRender(); // Re-render để cập nhật class active màu xanh
    });

    // Gắn sự kiện chuyển trang
    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');
    if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; applyFiltersAndRender(); } });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; applyFiltersAndRender(); });

    // Hiển thị chi tiết phòng được chọn
    const activeRoom = globalRooms[selectedRoomIndex];
    if (activeRoom) {
        renderDetailPane(activeRoom, selectedRoomIndex, () => {
            document.getElementById('app-container').classList.remove('mobile-detail-active');
        });
    }
}

// Đăng ký sự kiện
function setupEventListeners() {
    // 1. Bộ lọc khu vực
    document.querySelectorAll('.filter-district-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-district-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterDistrict = e.target.dataset.district;
            currentPage = 1;
            applyFiltersAndRender();
        });
    });

    // 2. Bộ lọc trạng thái
    document.getElementById('filter-status').addEventListener('change', (e) => {
        filterStatus = e.target.value;
        currentPage = 1;
        applyFiltersAndRender();
    });

    // 3. Tính toán chi phí tức thời trên Form modal khi có thay đổi nhập liệu
    const inputs = ['form-price', 'form-elecPrice', 'form-estElec', 'form-waterPrice', 'form-wifiPrice', 'form-servicePrice', 'form-distance'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', calculateModalCosts);
    });

    // 4. Đăng ký Upload Ảnh trực tiếp lên R2 từ từng ô file input
    document.querySelectorAll('.image-file-input').forEach(input => {
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const statusId = e.target.dataset.statusId;
            const targetUrlId = e.target.dataset.targetUrl;
            const statusDiv = document.getElementById(statusId);
            
            statusDiv.innerHTML = `<span class="text-primary">⏳ Đang tải...</span>`;
            try {
                const url = await uploadImageFile(file);
                document.getElementById(targetUrlId).value = url;
                statusDiv.innerHTML = `<span class="text-success">✅ Thành công</span>`;
            } catch (err) {
                statusDiv.innerHTML = `<span class="text-danger">❌ Lỗi tải ảnh</span>`;
            }
        });
    });

    // 5. Mở Modal Thêm mới phòng trọ
    document.getElementById('btn-open-add-modal').addEventListener('click', () => {
        document.getElementById('addRoomModalLabel').innerText = "Thêm phòng trọ mới";
        document.getElementById('btn-submit-room').innerText = "Lưu phòng trọ";
        document.getElementById('add-room-form').reset();
        
        document.getElementById('form-room-id').value = "";
        document.getElementById('form-room-index').value = "";
        document.getElementById('form-image-url-1').value = "";
        document.getElementById('form-image-url-2').value = "";
        document.getElementById('form-image-url-3').value = "";

        document.getElementById('upload-status-1').innerText = "Chưa tải ảnh";
        document.getElementById('upload-status-2').innerText = "Chưa tải ảnh";
        document.getElementById('upload-status-3').innerText = "Chưa tải ảnh";

        document.getElementById('form-elecPrice').value = DEFAULTS.elecPrice;
        document.getElementById('form-estElec').value = DEFAULTS.estElec;
        document.getElementById('form-waterPrice').value = DEFAULTS.waterPrice;
        document.getElementById('form-wifiPrice').value = DEFAULTS.wifiPrice;
        document.getElementById('form-servicePrice').value = DEFAULTS.servicePrice;
    });

    // 6. Sửa dữ liệu phòng trọ đang chọn
    document.getElementById('btn-edit-active').addEventListener('click', () => {
        const room = globalRooms[selectedRoomIndex];
        if (!room) return alert("Vui lòng click chọn 1 phòng trọ bên trái để Sửa.");

        document.getElementById('addRoomModalLabel').innerText = "Sửa thông tin phòng trọ";
        document.getElementById('btn-submit-room').innerText = "Cập nhật thay đổi";

        document.getElementById('form-room-id').value = room.id || "";
        document.getElementById('form-room-index').value = selectedRoomIndex;

        document.getElementById('form-price').value = room.price;
        document.getElementById('form-distance').value = room.distance;
        document.getElementById('form-address').value = room.address;
        document.getElementById('form-status').value = room.status;
        document.getElementById('form-details').value = room.details || "";
        document.getElementById('form-contact').value = room.contact || "";

        document.getElementById('form-image-url-1').value = room.image1 || "";
        document.getElementById('form-image-url-2').value = room.image2 || "";
        document.getElementById('form-image-url-3').value = room.image3 || "";

        document.getElementById('form-elecPrice').value = room.elecPrice || DEFAULTS.elecPrice;
        document.getElementById('form-estElec').value = room.estElec || DEFAULTS.estElec;
        document.getElementById('form-waterPrice').value = room.waterPrice || DEFAULTS.waterPrice;
        document.getElementById('form-wifiPrice').value = room.wifiPrice || DEFAULTS.wifiPrice;
        document.getElementById('form-servicePrice').value = room.servicePrice || DEFAULTS.servicePrice;

        for (let i = 1; i <= 3; i++) {
            const url = room[`image${i}`];
            document.getElementById(`upload-status-${i}`).innerHTML = url ? `<span class="text-success">✅ Sẵn sàng</span>` : "Chưa tải ảnh";
        }

        calculateModalCosts();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('addRoomModal')).show();
    });

    // 7. Xóa phòng trọ (Một hoặc nhiều phòng đã tích)
    document.getElementById('btn-delete-active').addEventListener('click', async () => {
        const checked = document.querySelectorAll('.bulk-select-checkbox:checked');
        if (checked.length > 0) {
            if (!confirm(`Xóa hàng loạt ${checked.length} phòng trọ đã chọn?`)) return;
            for (let cb of checked) {
                const idx = parseInt(cb.dataset.index);
                const r = globalRooms[idx];
                if (r && r.id) await saveRoomData({ action: "deleteRoom", id: r.id, index: idx });
            }
            alert("Đã xóa hoàn tất.");
        } else {
            const activeRoom = globalRooms[selectedRoomIndex];
            if (!activeRoom) return alert("Vui lòng chọn 1 phòng trọ để thực thi.");
            if (!confirm("Xóa phòng trọ này?")) return;
            await saveRoomData({ action: "deleteRoom", id: activeRoom.id, index: selectedRoomIndex });
        }
        selectedRoomIndex = 0;
        currentPage = 1;
        await loadRooms();
    });

    // 8. Đăng ký submit lưu Form dữ liệu
    document.getElementById('add-room-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-room');
        submitBtn.disabled = true;
        submitBtn.innerText = "Đang đồng bộ...";

        const roomId = document.getElementById('form-room-id').value;
        const roomIndex = document.getElementById('form-room-index').value;
        const action = roomId !== "" ? "updateRoom" : "addRoom";

        const payload = {
            action: action,
            id: roomId,
            index: roomIndex,
            price: parseFloat(document.getElementById('form-price').value),
            distance: parseFloat(document.getElementById('form-distance').value),
            address: document.getElementById('form-address').value,
            status: document.getElementById('form-status').value,
            priority: document.getElementById('form-priority').value,
            totalCost: parseFloat(document.getElementById('form-totalCost').value),
            splitCost: parseFloat(document.getElementById('form-splitCost').value),
            details: document.getElementById('form-details').value,
            contact: document.getElementById('form-contact').value,
            image1: document.getElementById('form-image-url-1').value || "",
            image2: document.getElementById('form-image-url-2').value || "",
            image3: document.getElementById('form-image-url-3').value || "",
            elecPrice: parseFloat(document.getElementById('form-elecPrice').value),
            estElec: parseFloat(document.getElementById('form-estElec').value),
            waterPrice: parseFloat(document.getElementById('form-waterPrice').value),
            wifiPrice: parseFloat(document.getElementById('form-wifiPrice').value),
            servicePrice: parseFloat(document.getElementById('form-servicePrice').value)
        };

        try {
            await saveRoomData(payload);
            bootstrap.Modal.getInstance(document.getElementById('addRoomModal')).hide();
            selectedRoomIndex = 0;
            await loadRooms();
        } catch (err) {
            alert("Lỗi đồng bộ: " + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Lưu phòng trọ";
        }
    });
}

// Tính toán thời gian thực các giá trị trong Form Modal
function calculateModalCosts() {
    const mockRoom = {
        price: parseFloat(document.getElementById('form-price').value) || 0,
        elecPrice: parseFloat(document.getElementById('form-elecPrice').value) || DEFAULTS.elecPrice,
        estElec: parseFloat(document.getElementById('form-estElec').value) || DEFAULTS.estElec,
        waterPrice: parseFloat(document.getElementById('form-waterPrice').value) || DEFAULTS.waterPrice,
        wifiPrice: parseFloat(document.getElementById('form-wifiPrice').value) || DEFAULTS.wifiPrice,
        servicePrice: parseFloat(document.getElementById('form-servicePrice').value) || DEFAULTS.servicePrice,
        distance: parseFloat(document.getElementById('form-distance').value) || 0
    };

    const { totalCost, splitCost, priority } = evaluateRoom(mockRoom);

    document.getElementById('form-totalCost').value = totalCost || "";
    document.getElementById('form-splitCost').value = splitCost || "";
    document.getElementById('form-priority').value = priority;
}