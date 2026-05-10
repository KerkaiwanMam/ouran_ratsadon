module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/apps/web/lib/mock-data.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MOCK_BUDGET",
    ()=>MOCK_BUDGET
]);
const MOCK_BUDGET = {
    metadata: {
        id: "mock-file-001",
        filename: "งบประมาณ_สำนักงาน_2567.pdf",
        fileType: "pdf",
        status: "done",
        uploadedAt: "2024-10-01T08:00:00.000Z",
        fiscalYear: "2567",
        organization: "สำนักงานเขตพื้นที่การศึกษา",
        parsedAt: "2024-10-01T08:01:23.000Z",
        totalItems: 12
    },
    summary: {
        totalBudget: 48_500_000,
        totalSpent: 32_180_000,
        totalRemaining: 16_320_000,
        categories: [
            {
                name: "บุคลากร",
                budget: 22_000_000,
                spent: 18_700_000,
                percentage: 45.4
            },
            {
                name: "ดำเนินงาน",
                budget: 12_500_000,
                spent: 8_200_000,
                percentage: 25.8
            },
            {
                name: "ลงทุน",
                budget: 8_000_000,
                spent: 3_480_000,
                percentage: 16.5
            },
            {
                name: "ครุภัณฑ์",
                budget: 4_000_000,
                spent: 1_500_000,
                percentage: 8.2
            },
            {
                name: "วัสดุ",
                budget: 2_000_000,
                spent: 300_000,
                percentage: 4.1
            }
        ]
    },
    items: [
        {
            id: "1",
            description: "เงินเดือนข้าราชการ",
            category: "บุคลากร",
            amount: 14_400_000,
            date: null,
            anomalyFlag: "none",
            anomalyReason: null
        },
        {
            id: "2",
            description: "ค่าจ้างลูกจ้างประจำ",
            category: "บุคลากร",
            amount: 4_200_000,
            date: null,
            anomalyFlag: "none",
            anomalyReason: null
        },
        {
            id: "3",
            description: "ค่าตอบแทนพนักงานราชการ",
            category: "บุคลากร",
            amount: 3_400_000,
            date: null,
            anomalyFlag: "none",
            anomalyReason: null
        },
        {
            id: "4",
            description: "ค่าสาธารณูปโภค",
            category: "ดำเนินงาน",
            amount: 1_800_000,
            date: null,
            anomalyFlag: "none",
            anomalyReason: null
        },
        {
            id: "5",
            description: "ค่าใช้จ่ายในการเดินทาง",
            category: "ดำเนินงาน",
            amount: 950_000,
            date: null,
            anomalyFlag: "warning",
            anomalyReason: "สูงกว่าค่าเฉลี่ยปีที่ผ่านมา 2.3 เท่า"
        },
        {
            id: "6",
            description: "ค่าเช่าอาคาร",
            category: "ดำเนินงาน",
            amount: 2_400_000,
            date: null,
            anomalyFlag: "none",
            anomalyReason: null
        },
        {
            id: "7",
            description: "ค่าวัสดุสำนักงาน",
            category: "วัสดุ",
            amount: 300_000,
            date: null,
            anomalyFlag: "none",
            anomalyReason: null
        },
        {
            id: "8",
            description: "ค่าครุภัณฑ์คอมพิวเตอร์",
            category: "ครุภัณฑ์",
            amount: 1_500_000,
            date: null,
            anomalyFlag: "none",
            anomalyReason: null
        },
        {
            id: "9",
            description: "ค่าก่อสร้างห้องประชุม",
            category: "ลงทุน",
            amount: 3_480_000,
            date: null,
            anomalyFlag: "critical",
            anomalyReason: "เกินวงเงินที่อนุมัติเบื้องต้น 15%"
        },
        {
            id: "10",
            description: "ค่าจัดซื้อวัสดุฝึกอบรม",
            category: "ดำเนินงาน",
            amount: 3_050_000,
            date: null,
            anomalyFlag: "none",
            anomalyReason: null
        },
        {
            id: "11",
            description: "ค่าจ้างที่ปรึกษาโครงการ",
            category: "ดำเนินงาน",
            amount: 4_500_000,
            date: null,
            anomalyFlag: "warning",
            anomalyReason: "รายการซ้ำกับไตรมาส 2"
        },
        {
            id: "12",
            description: "ค่าซ่อมแซมอาคาร",
            category: "ลงทุน",
            amount: 4_520_000,
            date: null,
            anomalyFlag: "none",
            anomalyReason: null
        }
    ]
};
}),
"[project]/apps/web/utils/format.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formatCurrency",
    ()=>formatCurrency,
    "formatDate",
    ()=>formatDate,
    "formatNumber",
    ()=>formatNumber,
    "formatPercent",
    ()=>formatPercent
]);
function formatCurrency(amount) {
    return new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}
function formatNumber(value) {
    return new Intl.NumberFormat("th-TH").format(value);
}
function formatDate(isoString) {
    return new Intl.DateTimeFormat("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(new Date(isoString));
}
function formatPercent(value) {
    return `${value.toFixed(1)}%`;
}
}),
"[project]/apps/web/components/shared/StatusBadge.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>StatusBadge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
const statusStyles = {
    ปกติ: "bg-green-100 text-[#1D9E75]",
    ผิดปกติ: "bg-red-100 text-[#E24B4A]",
    ตรวจสอบ: "bg-amber-100 text-[#BA7517]"
};
function StatusBadge({ status }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`,
        children: status
    }, void 0, false, {
        fileName: "[project]/apps/web/components/shared/StatusBadge.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
}),
"[project]/apps/web/app/(dashboard)/files/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>FilesPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/mock-data.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$utils$2f$format$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/utils/format.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$shared$2f$StatusBadge$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/shared/StatusBadge.tsx [app-rsc] (ecmascript)");
;
;
;
;
const MOCK_FILES = [
    __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MOCK_BUDGET"].metadata,
    {
        ...__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MOCK_BUDGET"].metadata,
        id: "mock-file-002",
        filename: "งบประมาณ_Q1_2567.xlsx",
        fileType: "xlsx",
        status: "done",
        uploadedAt: "2024-08-15T10:30:00.000Z",
        fiscalYear: "2567"
    },
    {
        ...__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MOCK_BUDGET"].metadata,
        id: "mock-file-003",
        filename: "งบประมาณ_2566.pdf",
        fileType: "pdf",
        status: "processing",
        uploadedAt: "2024-07-01T09:00:00.000Z",
        fiscalYear: "2566"
    }
];
function FilesPage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between mb-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl font-bold",
                        children: "ไฟล์ของฉัน"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                        lineNumber: 31,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        href: "/upload",
                        className: "px-4 py-2 bg-[#7F77DD] text-white text-sm rounded-md hover:bg-[#534AB7] transition-colors",
                        children: "อัปโหลดไฟล์ใหม่"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                        lineNumber: 32,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                lineNumber: 30,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white dark:bg-gray-800 rounded-lg p-4 border mb-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between text-sm mb-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-gray-600",
                                children: "โควต้าไฟล์เดือนนี้ (แผน Free)"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                lineNumber: 43,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: "1 / 3 ไฟล์"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                lineNumber: 44,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                        lineNumber: 42,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-full bg-gray-100 rounded-full h-2",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-[#7F77DD] h-2 rounded-full",
                            style: {
                                width: "33%"
                            }
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                            lineNumber: 47,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                        lineNumber: 46,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                    className: "w-full text-sm",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                className: "bg-gray-50 dark:bg-gray-700 text-left",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-4 py-3 font-medium text-gray-600 dark:text-gray-300",
                                        children: "ชื่อไฟล์"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                        lineNumber: 55,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-4 py-3 font-medium text-gray-600 dark:text-gray-300",
                                        children: "ปีงบประมาณ"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                        lineNumber: 56,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-4 py-3 font-medium text-gray-600 dark:text-gray-300",
                                        children: "วันที่อัปโหลด"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                        lineNumber: 57,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-4 py-3 font-medium text-gray-600 dark:text-gray-300",
                                        children: "สถานะ"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                        lineNumber: 58,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                        className: "px-4 py-3"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                        lineNumber: 59,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                lineNumber: 54,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                            lineNumber: 53,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                            className: "divide-y divide-gray-100 dark:divide-gray-700",
                            children: MOCK_FILES.map((file)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    className: "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-4 py-3",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-xs px-1.5 py-0.5 bg-gray-100 rounded font-mono uppercase",
                                                        children: file.fileType
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                                        lineNumber: 67,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: file.filename
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                                        lineNumber: 70,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                                lineNumber: 66,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                            lineNumber: 65,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-4 py-3 text-gray-500",
                                            children: file.fiscalYear ?? "—"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                            lineNumber: 73,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-4 py-3 text-gray-500",
                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$utils$2f$format$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formatDate"])(file.uploadedAt)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                            lineNumber: 74,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-4 py-3",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$shared$2f$StatusBadge$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                                                status: file.status === "done" ? "ปกติ" : file.status === "error" ? "ผิดปกติ" : "ตรวจสอบ"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                                lineNumber: 76,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                            lineNumber: 75,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            className: "px-4 py-3 text-right",
                                            children: file.status === "done" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: `/report/${file.id}`,
                                                className: "text-[#7F77DD] hover:underline text-xs",
                                                children: "ดูรายงาน →"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                                lineNumber: 88,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                            lineNumber: 86,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, file.id, true, {
                                    fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                                    lineNumber: 64,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                            lineNumber: 62,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                    lineNumber: 52,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
                lineNumber: 51,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/(dashboard)/files/page.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, this);
}
}),
"[project]/apps/web/app/(dashboard)/files/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/apps/web/app/(dashboard)/files/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0qpdf4-._.js.map