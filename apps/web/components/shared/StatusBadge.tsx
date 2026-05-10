type Status = "ปกติ" | "ผิดปกติ" | "ตรวจสอบ";

interface StatusBadgeProps {
  status: Status;
}

const statusStyles: Record<Status, string> = {
  ปกติ: "bg-green-100 text-[#1D9E75]",
  ผิดปกติ: "bg-red-100 text-[#E24B4A]",
  ตรวจสอบ: "bg-amber-100 text-[#BA7517]",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
