// src/pages/Dashboard.tsx
import React from "react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">CNG Control Center</h1>
        <p className="mt-2 text-gray-600">
          Pilih modul utama. Tombol besar, alur sederhana, tanpa pusing DO.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* PEMBELIAN (SPBG / Deposit Groups) */}
        <Link
          to="/pembelian"
          className="group flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg transition-shadow"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">🧾</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-green-600">
                Pembelian
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              SPBG & Deposit Gas
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Atur deposit SPBG dan slot pembelian gas yang menunggu nota supir.
            </p>
          </div>
          <button className="mt-4 w-full rounded-lg bg-green-600 py-2 text-sm font-semibold text-white group-hover:bg-green-700">
            Buka Modul Pembelian
          </button>
        </Link>

        {/* PENJUALAN (Nota kecil/besar + CCTV) */}
        <Link
          to="/penjualan"
          className="group flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg transition-shadow"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">📹</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Penjualan
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Nota & CCTV Penjualan
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Kelola nota kecil/besar dan pantau CCTV untuk volume penjualan gas.
            </p>
          </div>
          <button className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white group-hover:bg-blue-700">
            Buka Modul Penjualan
          </button>
        </Link>

        {/* RITASE & LAPORAN (customer + nota kecil) */}
        {/* <Link
          to="/ritase/comprehensive"
          className="group flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg transition-shadow"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">📊</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Ritase & Laporan
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Laporan Customer & Nota Kecil
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Fokus ke laporan ritase berdasarkan customer dan nota kecil yang sudah diproses.
            </p>
          </div>
          <button className="mt-4 w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white group-hover:bg-indigo-700">
            Buka Ritase & Laporan
          </button>
        </Link> */}

        {/* CUSTOMERS */}
        <Link
          to="/customers"
          className="group flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg transition-shadow"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">👥</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-teal-600">
                Customers
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Manajemen Customer
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Kelola data pelanggan dan akses cepat ke histori nota kecil & besar mereka.
            </p>
          </div>
          <button className="mt-4 w-full rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white group-hover:bg-teal-700">
            Buka Modul Customer
          </button>
        </Link>

        {/* FLEET */}
        <Link
          to="/fleet"
          className="group flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg transition-shadow"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">🚛</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-yellow-600">
                Fleet
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Peta Armada & Manajemen Driver
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Lihat posisi truk, status perjalanan, dan atur driver dari satu tempat.
            </p>
          </div>
          <button className="mt-4 w-full rounded-lg bg-yellow-500 py-2 text-sm font-semibold text-white group-hover:bg-yellow-600">
            Buka Modul Fleet
          </button>
        </Link>

        {/* INVENTARIS */}
        <Link
          to="/inventaris"
          className="group flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg transition-shadow"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">📦</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                Inventaris
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Stok Ban, Sparepart, & Infrastruktur
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Kelola stok ban, sparepart, dan infrastruktur dengan tampilan
              sederhana.
            </p>
          </div>
          <button className="mt-4 w-full rounded-lg bg-purple-600 py-2 text-sm font-semibold text-white group-hover:bg-purple-700">
            Buka Modul Inventaris
          </button>
        </Link>

        {/* LAIN-LAIN */}
        <Link
          to="/payments"
          className="group flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg transition-shadow"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">🧰</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Lain-lain
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Kas, Pembayaran, & Laporan
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Akses modul tambahan seperti kas, payments, ritase, dan pengaturan SPBG.
            </p>
          </div>
          <button className="mt-4 w-full rounded-lg bg-gray-700 py-2 text-sm font-semibold text-white group-hover:bg-gray-800">
            Buka Menu Lain-lain
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
