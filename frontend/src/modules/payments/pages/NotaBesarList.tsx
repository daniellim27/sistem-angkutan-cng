// frontend/src/modules/payments/pages/NotaBesarList.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../../../api/axiosConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileInvoiceDollar,
  faEye,
  faExclamationCircle,
  faTruck,
  faMoneyBillWave
} from '@fortawesome/free-solid-svg-icons';

interface NotaBesar {
  id: number;
  total_volume: string;
  total_price: string;
  gas_price_per_m3: string;
  created_at: string;
  creator: {
    id: number;
    username: string;
  };
  deliveryOrder: {
    id: number;
    do_number: string;
    final_amount?: number;
    payment_status?: string;
  };
  items?: Array<{
    id: number;
    price: string;
    notaKecil: {
      id: number;
      customer_name: string;
      customer_address?: string;
    };
  }>;
  notes?: string;
}

interface DeliveryOrderPaymentInfo {
  delivery_order_id: number;
  do_number: string;
  final_amount: number;
  total_paid: number;
  outstanding_amount: number;
  payment_status: string;
}

interface NotaBesarWithPayment extends NotaBesar {
  paymentInfo?: DeliveryOrderPaymentInfo;
}

const NotaBesarList: React.FC = () => {
  const navigate = useNavigate();
  const [notaBesars, setNotaBesars] = useState<NotaBesarWithPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchNotaBesarsWithPaymentInfo();
  }, []);

  const fetchNotaBesarsWithPaymentInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all nota besars
      const response = await authClient.get('/nota-besars');
      const basicNotaBesars = response.data.data || [];
      
      if (basicNotaBesars.length === 0) {
        setNotaBesars([]);
        return;
      }
      
      // Fetch detailed data for each nota besar
      console.log(`Fetching details and payment info for ${basicNotaBesars.length} nota besars...`);
      const detailedNotaBesars = await Promise.all(
        basicNotaBesars.map(async (notaBesar: any) => {
          try {
            // Fetch nota besar details
            const detailResponse = await authClient.get(`/nota-besars/${notaBesar.id}`);
            const notaBesarDetail = detailResponse.data.data;
            
            // Fetch payment info for the delivery order
            let paymentInfo: DeliveryOrderPaymentInfo | undefined;
            try {
              const paymentResponse = await authClient.get(`/delivery-orders/${notaBesarDetail.deliveryOrder.id}`);
              const doData = paymentResponse.data.data;
              
              // Calculate outstanding amount
              const finalAmount = parseFloat(doData.final_amount || doData.total_amount || 0);
              const totalPaid = parseFloat(doData.total_paid || 0);
              const outstandingAmount = finalAmount - totalPaid;
              
              paymentInfo = {
                delivery_order_id: doData.id,
                do_number: doData.do_number,
                final_amount: finalAmount,
                total_paid: totalPaid,
                outstanding_amount: outstandingAmount,
                payment_status: doData.payment_status || 'pending'
              };
            } catch (paymentError) {
              console.error(`Error fetching payment info for DO ${notaBesarDetail.deliveryOrder.id}:`, paymentError);
            }
            
            return {
              ...notaBesarDetail,
              paymentInfo
            };
          } catch (error) {
            console.error(`Error fetching details for nota besar ${notaBesar.id}:`, error);
            return notaBesar;
          }
        })
      );
      
      setNotaBesars(detailedNotaBesars);
      console.log('Fetched nota besars with payment info:', detailedNotaBesars);
    } catch (error) {
      console.error('Error fetching nota besars:', error);
      setError('Failed to fetch nota besars with payment information');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleNotaBesarClick = (notaBesar: NotaBesarWithPayment) => {
    navigate(`/operations/nota-besar/${notaBesar.id}`);
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { bg: string; text: string; label: string } } = {
      'pending': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
      'proses_tagihan': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Process' },
      'deposit': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Partial' },
      'lunas': { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
    };
    
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Get unique customers for a nota besar
  const getCustomersForNotaBesar = (notaBesar: NotaBesarWithPayment): string[] => {
    if (!notaBesar.items) return [];
    
    const customerSet = new Set<string>();
    notaBesar.items.forEach(item => {
      if (item.notaKecil.customer_name) {
        customerSet.add(item.notaKecil.customer_name);
      }
    });
    
    return Array.from(customerSet);
  };

  // Filter nota besars based on payment status
  const filteredNotaBesars = notaBesars.filter(notaBesar => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'outstanding') {
      return notaBesar.paymentInfo && notaBesar.paymentInfo.outstanding_amount > 0;
    }
    if (filterStatus === 'paid') {
      return notaBesar.paymentInfo && notaBesar.paymentInfo.outstanding_amount <= 0;
    }
    return notaBesar.paymentInfo?.payment_status === filterStatus;
  });

  // Calculate totals
  // Sum of all nota besar prices (this should correspond to outstanding amount in /payments)
  const totalNotaBesarPrice = filteredNotaBesars.reduce((sum, nota) => sum + parseFloat(nota.total_price), 0);
  
  // Track unique DOs for payment info
  const uniqueDOs = new Map<number, DeliveryOrderPaymentInfo>();
  filteredNotaBesars.forEach(nota => {
    if (nota.paymentInfo && !uniqueDOs.has(nota.paymentInfo.delivery_order_id)) {
      uniqueDOs.set(nota.paymentInfo.delivery_order_id, nota.paymentInfo);
    }
  });

  // Calculate totals from unique DOs
  const totalOutstanding = Array.from(uniqueDOs.values()).reduce((sum, info) => sum + info.outstanding_amount, 0);
  const totalPaid = Array.from(uniqueDOs.values()).reduce((sum, info) => sum + info.total_paid, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-600">Loading payment information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error: {error}</p>
          <button
            onClick={fetchNotaBesarsWithPaymentInfo}
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Back Button */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/payments')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Payments
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Nota Besar - Payment Overview</h1>
        <p className="text-gray-600 mt-2">
          View nota besars and their delivery order payment status. The <strong>Total Nota Besar Price</strong> is <strong>added to</strong> the Outstanding Amount shown in the Payments Overview.
        </p>
      </div>

      {notaBesars.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-lg">No nota besars found</p>
          <p className="text-gray-400 text-sm mt-2">Create nota besars from nota kecils in operations management</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Nota Besars
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {filteredNotaBesars.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Nota Besar Price
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatCurrency(totalNotaBesarPrice)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <FontAwesomeIcon icon={faExclamationCircle} className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Outstanding Amount
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatCurrency(totalOutstanding)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <FontAwesomeIcon icon={faMoneyBillWave} className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Paid
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatCurrency(totalPaid)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by Payment Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="outstanding">Has Outstanding</option>
                <option value="paid">Fully Paid</option>
                <option value="pending">Pending</option>
                <option value="proses_tagihan">In Process</option>
                <option value="deposit">Partial Payment</option>
                <option value="lunas">Paid</option>
              </select>
            </div>
          </div>

          {/* Nota Besars Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nota Besar ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delivery Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nota Besar Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DO Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outstanding
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredNotaBesars.map((notaBesar) => {
                    const customers = getCustomersForNotaBesar(notaBesar);
                    const hasOutstanding = notaBesar.paymentInfo && notaBesar.paymentInfo.outstanding_amount > 0;
                    
                    return (
                      <tr 
                        key={notaBesar.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleNotaBesarClick(notaBesar)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FontAwesomeIcon icon={faFileInvoiceDollar} className="w-4 h-4 text-blue-600 mr-2" />
                            <span className="text-sm font-bold text-gray-900">#{notaBesar.id}</span>
                          </div>
                          <div className="text-xs text-gray-500">{formatDate(notaBesar.created_at)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FontAwesomeIcon icon={faTruck} className="w-4 h-4 text-green-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900">{notaBesar.deliveryOrder.do_number}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {customers.slice(0, 2).map((customer, idx) => (
                              <span 
                                key={idx}
                                className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                              >
                                {customer}
                              </span>
                            ))}
                            {customers.length > 2 && (
                              <span className="text-xs text-gray-500">+{customers.length - 2} more</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-purple-600">
                            {formatCurrency(parseFloat(notaBesar.total_price))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {parseFloat(notaBesar.total_volume).toFixed(2)} m³
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {notaBesar.paymentInfo 
                              ? formatCurrency(notaBesar.paymentInfo.final_amount)
                              : '-'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-green-600">
                            {notaBesar.paymentInfo 
                              ? formatCurrency(notaBesar.paymentInfo.total_paid)
                              : '-'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-bold ${hasOutstanding ? 'text-red-600' : 'text-gray-400'}`}>
                            {notaBesar.paymentInfo 
                              ? formatCurrency(notaBesar.paymentInfo.outstanding_amount)
                              : '-'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {notaBesar.paymentInfo 
                            ? getPaymentStatusBadge(notaBesar.paymentInfo.payment_status)
                            : <span className="text-xs text-gray-400">N/A</span>
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotaBesarClick(notaBesar);
                            }}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                            title="View Details"
                          >
                            <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredNotaBesars.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No nota besars match the selected filter
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotaBesarList;

