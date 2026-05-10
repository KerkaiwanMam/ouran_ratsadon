import StatCard from "@/components/shared/StatCard";
import { formatCurrency, formatDate } from "@/utils/format";

const MOCK_STATS = {
  totalUsers: 142,
  proMembers: 38,
  uploadsToday: 17,
  monthlyRevenue: 38 * 299,
};

const MOCK_RECENT_USERS = [
  { id: "u1", name: "สมชาย ใจดี",     email: "somchai@example.com", plan: "Pro",  joinedAt: "2024-10-01T08:00:00Z" },
  { id: "u2", name: "สมหญิง รักดี",   email: "somying@example.com", plan: "Free", joinedAt: "2024-10-02T10:00:00Z" },
  { id: "u3", name: "ประยุทธ์ แก้วมา", email: "prayut@example.com",  plan: "Pro",  joinedAt: "2024-10-03T09:30:00Z" },
  { id: "u4", name: "มาลี สุขสันต์",   email: "malee@example.com",   plan: "Free", joinedAt: "2024-10-04T14:00:00Z" },
  { id: "u5", name: "อนุชา พงษ์ดี",   email: "anucha@example.com",  plan: "Pro",  joinedAt: "2024-10-05T11:00:00Z" },
];

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">แผงควบคุมผู้ดูแลระบบ</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="ผู้ใช้งานทั้งหมด" value={MOCK_STATS.totalUsers} unit="คน" />
        <StatCard label="สมาชิก Pro" value={MOCK_STATS.proMembers} unit="คน" trend="up" />
        <StatCard label="อัปโหลดวันนี้" value={MOCK_STATS.uploadsToday} unit="ไฟล์" />
        <StatCard
          label="รายได้เดือนนี้"
          value={formatCurrency(MOCK_STATS.monthlyRevenue)}
          trend="up"
        />
      </div>

      {/* Recent Users */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-medium">ผู้ใช้งานล่าสุด</h3>
          <a href="/admin/users" className="text-xs text-[#7F77DD] hover:underline">
            ดูทั้งหมด →
          </a>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">ชื่อ</th>
              <th className="px-4 py-3 font-medium text-gray-600">อีเมล</th>
              <th className="px-4 py-3 font-medium text-gray-600">แผน</th>
              <th className="px-4 py-3 font-medium text-gray-600">สมัครเมื่อ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MOCK_RECENT_USERS.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.plan === "Pro"
                        ? "bg-purple-100 text-[#7F77DD]"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(user.joinedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
