# Slack Message Deleter (Slack Clearer)

**Slack Message Deleter** là một tiện ích mở rộng (Chrome Extension) mạnh mẽ, giúp bạn tự động tìm và xóa hàng loạt tin nhắn của mình (hoặc của một người dùng cụ thể) trên các kênh và hội thoại Slack. Công cụ được thiết kế để hoạt động trực tiếp trên trình duyệt, đảm bảo an toàn bảo mật dữ liệu của bạn.

---

## ✨ Các tính năng nổi bật

* **Tự động bắt Token & Phiên hoạt động:** Không cần nhập thủ công API Token phức tạp. Chỉ cần bạn đăng nhập Slack trên trình duyệt, tiện ích sẽ tự động nhận diện token và thông tin Workspace của bạn.
* **Tải danh sách hội thoại đầy đủ:** Hỗ trợ load toàn bộ các Kênh công khai (Public Channels), Kênh riêng tư (Private Channels), Nhóm chat (MPIM) và Tin nhắn trực tiếp (Direct Messages - DMs).
* **Lọc tìm kiếm thông minh:** Tìm kiếm nhanh hội thoại và lọc nhanh theo loại (Chỉ chọn kênh, Chỉ chọn DM, Chọn tất cả, Bỏ chọn).
* **Tùy biến cấu hình xóa:**
  * **User ID:** Xóa tin nhắn của chính bạn (mặc định) hoặc một tài khoản cụ thể.
  * **Xóa tin nhắn trong Thread:** Tùy chọn quét và xóa cả các câu trả lời bên trong các Thread.
  * **Tốc độ trễ (Delay):** Tùy chỉnh độ trễ giữa các lượt xóa (từ 100ms - 2000ms) để tối ưu tốc độ và tránh bị Slack giới hạn lượt yêu cầu (Rate Limit 429).
* **Bảng điều khiển trực quan:**
  * Biểu thị tiến trình xóa bằng thanh phần trăm trực quan.
  * Hỗ trợ nút **Tạm dừng**, **Tiếp tục** và **Dừng lại** tiến trình bất cứ lúc nào.
  * Khung console hiển thị nhật ký hoạt động (log) chi tiết theo thời gian thực.

---

## 🛠️ Hướng dẫn cài đặt vào Google Chrome

Vì đây là tiện ích mở rộng đang trong quá trình phát triển (chưa đưa lên Chrome Web Store), bạn cần cài đặt bằng **Chế độ nhà phát triển (Developer Mode)** theo các bước dưới đây:

### Bước 1: Tải mã nguồn về máy tính
Hãy đảm bảo bạn đã clone hoặc tải thư mục mã nguồn này (`slack-message-deleter`) về máy tính của mình.

### Bước 2: Mở trang quản lý Tiện ích mở rộng của Chrome
1. Mở trình duyệt Google Chrome.
2. Truy cập vào địa chỉ: `chrome://extensions/` (hoặc nhấn vào biểu tượng **3 chấm** ở góc phải -> **Tiện ích mở rộng (Extensions)** -> **Quản lý tiện ích mở rộng (Manage Extensions)**).

### Bước 3: Bật Chế độ nhà phát triển (Developer Mode)
* Ở góc trên bên phải của trang Quản lý tiện ích mở rộng, hãy gạt công tắc **Chế độ nhà phát triển (Developer mode)** sang vị trí **Bật** (ON).

### Bước 4: Tải tiện ích lên trình duyệt
1. Nhấp vào nút **Tải tiện ích đã giải nén (Load unpacked)** ở góc trên bên trái.
2. Chọn thư mục chứa dự án này (`slack-message-deleter` - thư mục chứa file `manifest.json`).
3. Nhấp **Select** (hoặc **Open**).

Tiện ích **Slack Message Deleter** lúc này sẽ xuất hiện trong danh sách và sẵn sàng sử dụng!

> [!TIP]
> Bạn nên ghim (pin) tiện ích này lên thanh công cụ của Chrome để mở nhanh khi cần sử dụng.

---

## 📖 Hướng dẫn sử dụng chi tiết

### Bước 1: Mở Slack Web trên trình duyệt
1. Truy cập vào Workspace Slack của bạn trên trình duyệt (ví dụ: `https://app.slack.com/client/...` hoặc `https://<ten-workspace>.slack.com`).
2. Đăng nhập vào tài khoản của bạn (nếu chưa đăng nhập).
3. **Lưu ý:** Giữ tab Slack này luôn hoạt động trong suốt quá trình xóa.

### Bước 2: Mở tiện ích Slack Clearer
* Nhấp vào biểu tượng tiện ích trên thanh công cụ trình duyệt.
* Hệ thống sẽ tự động quét phiên hoạt động hiện tại. Nếu thành công, bạn sẽ thấy thông báo trạng thái **Kết nối thành công!** cùng tên **Workspace** và **Tên tài khoản** của bạn xuất hiện trong khung thông tin.
* *Nếu xuất hiện cảnh báo "Không tìm thấy tab Slack", hãy chắc chắn bạn đã mở trang Slack trên web và F5 tải lại trang.*

### Bước 3: Tải danh sách hội thoại
1. Nhấp vào nút **Tải Danh Sách Hội Thoại** (Fetch Conversations).
2. Tiện ích sẽ lấy danh sách các kênh và DM bạn đang tham gia.
3. Sử dụng ô tìm kiếm và các nút lọc nhanh để chọn các hội thoại bạn muốn xóa tin nhắn. tích chọn vào các ô vuông bên cạnh tên hội thoại.

### Bước 4: Cấu hình và tiến hành xóa
1. **Xóa tin nhắn của User ID:**
   * Mặc định, tiện ích sẽ tự điền ID của chính bạn để chỉ xóa tin nhắn do bạn gửi.
   * Nếu bạn là Quản trị viên (Admin) và muốn xóa tin nhắn của người khác hoặc toàn bộ tin nhắn trong kênh, bạn có thể nhập User ID của họ hoặc xóa trống trường này (Yêu cầu quyền Admin Workspace).
2. **Xoá cả tin nhắn trong Thread:** Tích chọn nếu muốn xóa cả các tin nhắn nằm sâu trong các cuộc thảo luận phụ (Thread).
3. **Tốc độ trễ (Delay):** Bạn nên giữ ở mức **300ms - 500ms** để đảm bảo quá trình diễn ra trơn tru mà không bị lỗi Slack Rate Limit (lỗi 429).
4. Nhấp nút **Bắt Đầu Xóa Tự Động** (Start Deletion) màu đỏ.

### Bước 5: Giám sát và điều khiển
* Trình duyệt sẽ chạy tiến trình xóa tự động. Bạn sẽ thấy thanh tiến độ chạy và số lượng tin nhắn đã xóa cập nhật liên tục.
* Nhật ký hoạt động chi tiết sẽ được xuất ra khung Console phía dưới.
* Bạn có thể nhấn **Tạm Dừng** (Pause) để nghỉ, **Tiếp Tục** (Resume) để chạy tiếp hoặc **Dừng Lại** (Stop) để hủy hoàn toàn phiên làm việc.

---

## ⚠️ Các lưu ý quan trọng

> [!IMPORTANT]
> * **Giữ tab Slack hoạt động:** Không đóng tab Slack trên trình duyệt khi quá trình xóa đang diễn ra, vì extension cần chạy ngầm dựa trên tab đó để gửi API.
> * **Lỗi Rate Limit (HTTP 429):** Slack giới hạn số lượng request API gửi lên trong một khoảng thời gian. Nếu bạn đặt độ trễ quá nhanh và gặp lỗi 429, tiện ích sẽ tự động nhận diện, tạm dừng vài giây và tiếp tục. Tuy nhiên, khuyến nghị nên giữ độ trễ từ **300ms trở lên**.
> * **Bảo mật tối đa:** Tiện ích này hoạt động hoàn toàn ở phía máy khách (Client-side) trên trình duyệt của bạn. Nó không lưu trữ, thu thập hoặc gửi API Token hay dữ liệu tin nhắn của bạn tới bất kỳ máy chủ bên thứ ba nào.

---

Chúc bạn có những trải nghiệm dọn dẹp Slack nhanh chóng và an toàn! Nếu có bất kỳ câu hỏi nào, vui lòng liên hệ nhà phát triển.
