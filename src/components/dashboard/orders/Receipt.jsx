
import React from 'react';

const Receipt = ({ order }) => {
  if (!order) return null;
  const businessInfo = JSON.parse(localStorage.getItem('businessInfo') || '{}');
  const currency = businessInfo.currencySymbol || businessInfo.currency || '';

  return (
    <div className="w-[300px] p-4 bg-white text-black font-mono text-xs">
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold">{businessInfo.name || 'SonTag POS/ERP software'}</h1>
        <p>{businessInfo.address || '123 Main Street, Anytown, USA'}</p>
        <p>Tel: {businessInfo.phone || '(123) 456-7890'}</p>
      </div>
      <div className="border-t border-b border-dashed border-black py-2 mb-2">
        <p>Order: {order.id}</p>
        <p>Date: {new Date(order.timestamp).toLocaleString()}</p>
        <p>Cashier: {order.staff}</p>
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left">ITEM</th>
            <th className="text-center">QTY</th>
            <th className="text-right">PRICE</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={index}>
              <td className="text-left">{item.name}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-right">{currency}{(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-dashed border-black mt-2 pt-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{currency}{order.total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax (0%)</span>
          <span>{currency}0.00</span>
        </div>
        <div className="flex justify-between font-bold text-sm mt-1">
          <span>TOTAL</span>
          <span>{currency}{order.total.toFixed(2)}</span>
        </div>
      </div>
      <div className="border-t border-dashed border-black mt-2 pt-2">
        <div className="flex justify-between">
          <span>Payment Method</span>
          <span>{order.paymentMethod}</span>
        </div>
      </div>
      <div className="text-center mt-4">
        {businessInfo.receiptFooterNote && <p>{businessInfo.receiptFooterNote}</p>}
        <div className="mt-2 text-gray-500 text-[10px]">
          <p>SonTag POS/ERP software | Developed by SonTag Technologies</p>
          <p>Phone: +234-901-904-2426</p>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
