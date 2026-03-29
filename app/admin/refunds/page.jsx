"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import Image from "next/image";
import Link from "next/link";
import PremiumModal from "@/components/PremiumModal";

export default function AdminRefundsPage() {
    const [activeTab, setActiveTab] = useState(1); // 1 = Pending, 2 = Refunded
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState(null);

    // Modal state
    const [modal, setModal] = useState({
        isOpen: false,
        title: "",
        description: "",
        type: "alert",
        icon: "💡",
    });

    const openModal = (config) => {
        setModal({ ...modal, ...config, isOpen: true });
    };

    const fetchRefunds = async (status) => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost/bitesync/api/admin/refunds.php?status=${status}`);
            const data = await res.json();
            if (data.success) {
                setRefunds(data.data || []);
            } else {
                console.error("Failed to fetch refunds");
            }
        } catch (error) {
            console.error("Error fetching refunds:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRefunds(activeTab);
    }, [activeTab]);

    const handleUpload = async (e, orderId) => {
        e.preventDefault();
        const fileInput = e.target.elements.slipFile;
        const file = fileInput.files[0];

        if (!file) {
            openModal({
                title: "แจ้งเตือน",
                description: "กรุณาแนบสลิปการโอนเงินก่อนยืนยันครับ",
                type: "alert",
                icon: "⚠️"
            });
            return;
        }

        const formData = new FormData();
        formData.append("orderId", orderId);
        formData.append("slip", file);

        setUploadingId(orderId);

        try {
            const res = await fetch("http://localhost/bitesync/api/admin/refunds.php", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                openModal({
                    title: "บันทึกสำเร็จ ✨",
                    description: "อัปเดตสถานะการคืนเงินเรียบร้อยแล้วครับ",
                    type: "success",
                    icon: "✅"
                });
                // Refresh list
                fetchRefunds(activeTab);
            } else {
                openModal({
                    title: "ข้อผิดพลาด",
                    description: data.message || "อัปโหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
                    type: "alert",
                    icon: "❌"
                });
            }
        } catch (error) {
            console.error("Upload error:", error);
            openModal({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์",
                type: "alert",
                icon: "🌐"
            });
        } finally {
            setUploadingId(null);
        }
    };

    return (
        <div className={styles.container}>
            <Link href="/admin/dashboard" className={styles.backBtn}>
                <i className="fa-solid fa-chevron-left" /> กลับหน้าหลัก
            </Link>

            <h1 className={styles.title}>จัดการเงินคืนลูกค้า (Refunds)</h1>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tabBtn} ${activeTab === 1 ? styles.active : ""}`}
                    onClick={() => setActiveTab(1)}
                >
                    รอโอนคืน ({activeTab === 1 ? refunds.length : "..."})
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 2 ? styles.active : ""}`}
                    onClick={() => setActiveTab(2)}
                >
                    โอนสำเร็จแล้ว
                </button>
            </div>

            {loading ? (
                <div className={styles.noData}>กำลังโหลดข้อมูล...</div>
            ) : refunds.length === 0 ? (
                <div className={styles.noData}>
                    {activeTab === 1 ? "🎉 ไม่มีรายการที่ต้องโอนคืน" : "ยังไม่มีประวัติการโอนคืน"}
                </div>
            ) : (
                <div className={styles.list}>
                    {refunds.map((r) => (
                        <div key={r.orderId} className={styles.card}>
                            <div className={styles.header}>
                                <span className={styles.orderId}>Order #{r.orderId}</span>
                                <span className={styles.amount}>
                                    {r.amount.toFixed(2)} <span>฿</span>
                                </span>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.infoGroup}>
                                    <span className={styles.label}>ชื่อลูกค้า</span>
                                    <span className={styles.value}>{r.name}</span>
                                </div>
                                <div className={styles.infoGroup}>
                                    <span className={styles.label}>ธนาคาร</span>
                                    <span className={styles.value}>{r.bank || "ไม่ระบุ"}</span>
                                </div>
                                <div className={styles.infoGroup}>
                                    <span className={styles.label}>เลขบัญชี</span>
                                    <span className={styles.value}>{r.account || "ไม่ระบุ"}</span>
                                </div>
                                <div className={styles.infoGroup}>
                                    <span className={styles.label}>เวลาที่สั่ง</span>
                                    <span className={styles.value}>{new Date(r.orderDate).toLocaleString('th-TH')}</span>
                                </div>
                            </div>

                            {/* Pending State -> Actions */}
                            {r.status === 1 && (
                                <form 
                                    className={styles.uploadSection} 
                                    onSubmit={(e) => handleUpload(e, r.orderId)}
                                >
                                    <span className={styles.label}>อัปโหลดสลิปโอนเงิน (หลักฐาน)</span>
                                    <input 
                                        type="file" 
                                        name="slipFile" 
                                        accept="image/jpeg, image/png, image/jpg" 
                                        className={styles.fileInput} 
                                        required 
                                    />
                                    <button 
                                        type="submit" 
                                        className={styles.submitBtn}
                                        disabled={uploadingId === r.orderId || !r.bank || !r.account}
                                    >
                                        {uploadingId === r.orderId ? "กำลังอัปโหลด..." : "ยืนยันการโอนเงินคืน"}
                                    </button>
                                    {(!r.bank || !r.account) && (
                                        <small style={{ color: 'red', marginTop: '8px', display: 'block' }}>*ไม่สามารถโอนได้เนื่องจากลูกค้ายังไม่ระบุบัญชีธนาคาร</small>
                                    )}
                                </form>
                            )}

                            {/* Refunded State -> Display Status */}
                            {r.status === 2 && r.slip && (
                                <div className={styles.infoGroup}>
                                    <span className={styles.label} style={{ color: "#10b981", marginBottom: '8px' }}>✓ โอนคืนแล้ว</span>
                                    <a href={r.slip} target="_blank" rel="noopener noreferrer">
                                        <Image 
                                            src={r.slip} 
                                            alt="Refund Slip" 
                                            width={150} 
                                            height={200} 
                                            className={styles.slipImage} 
                                            style={{ objectFit: 'contain' }}
                                        />
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <PremiumModal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.title}
                description={modal.description}
                type={modal.type}
                icon={modal.icon}
            />
        </div>
    );
}
