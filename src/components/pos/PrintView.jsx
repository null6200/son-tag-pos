
import React, { forwardRef } from 'react';

const PrintView = forwardRef(({ type, data }, ref) => {
  if (!data) return null;

  const renderContent = () => {
    switch (type) {
      case 'final-receipt':
        return <FinalPrintout data={{ ...data, isReceipt: true }} />;
      case 'table-bill':
        return <FinalPrintout data={data} />;
      case 'item-invoice':
        return <ItemInvoice data={data} />;
      default:
        return <div>Unsupported print type</div>;
    }
  };

  return (
    <div className="hidden print:block">
      {/* Print isolation CSS: hide everything except .pos-print-root when printing */}
      <style>{`
        @page { margin: 0; }
        @media print {
          body * { visibility: hidden !important; }
          .pos-print-root, .pos-print-root * { visibility: visible !important; }
          .pos-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      <div className="pos-print-root">
        <div ref={ref} style={styles.page}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
});

const FinalPrintout = ({ data }) => {
  const { items, subtotal, discount, tax, total, taxRate, paymentDetails, waiter, cashier, branch, section, serviceType, table, id, createdAt, isReceipt, isDraft } = data;
  
  const title = String(isReceipt ? 'RECEIPT' : (isDraft ? 'DRAFT BILL' : 'BILL'));
  let businessInfo = {};
  try {
    const raw = localStorage.getItem('businessInfo');
    businessInfo = raw ? JSON.parse(raw) : {};
  } catch { businessInfo = {}; }
  const footerMessage = isReceipt
    ? String(businessInfo.receiptFooterNote || '')
    : String(businessInfo.invoiceFooterNote || '');
  const sanitizeSymbol = (raw) => {
    const str = String(raw || '').trim();
    const m = str.match(/[$€£₦¥₹₽﷼₺₩₫]/);
    if (m) return m[0];
    const code = (str.split(/\s|-|\|/)[0] || '').toUpperCase().slice(0,3);
    const map = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', INR: '₹' };
    return map[code] || (code && code.length === 3 ? code : '');
  };
  const currency = sanitizeSymbol(businessInfo.currencySymbol || businessInfo.currency || '');
  const fmtMoney = (n) => {
    const num = Number(n || 0);
    if (!Number.isFinite(num)) return `${currency ? currency + ' ' : ''}0.00`;
    const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${currency ? currency + ' ' : ''}${formatted}`;
  };

  return (
    <div style={styles.container}>
      <TopHeader logoUrl={businessInfo.logoUrl || ''} />
      <Header branch={branch} section={section} />
      <hr style={styles.dashedHr} />
      <h2 style={styles.subHeader}>{title}</h2>
      <hr style={styles.dashedHr} />
      <div style={{...styles.section, borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
        <p><strong>No:</strong> #{id || Math.floor(Date.now() / 1000)}</p>
        <p><strong>Date:</strong> {new Date(createdAt || Date.now()).toLocaleString()}</p>
        <p><strong>Service Type:</strong> {typeof serviceType === 'string' ? serviceType : (serviceType?.name || serviceType?.label || '')}</p>
        {/dine/i.test(String(serviceType || '')) && table && (
          <p><strong>Table:</strong> {typeof table === 'string' ? table : (table?.name || table?.label || String(table?.id || '') || '')}</p>
        )}
        {waiter && <p><strong>Served by:</strong> {typeof waiter === 'string' ? waiter : (waiter?.name || waiter?.username || '')}</p>}
        {cashier && <p><strong>Processed by:</strong> {typeof cashier === 'string' ? cashier : (cashier?.name || cashier?.username || '')}</p>}
      </div>
      <hr style={styles.dashedHr} />
      <ItemsTable items={items} fmtMoney={fmtMoney} />
      <hr style={styles.dashedHr} />
      <Totals items={items} subtotal={subtotal} discount={discount} tax={tax} total={total} taxRate={taxRate} fmtMoney={fmtMoney} />
      {isReceipt && <hr style={styles.dashedHr} />}
      {isReceipt && <PaymentInfo paymentDetails={paymentDetails} fmtMoney={fmtMoney} />}
      <hr style={styles.dashedHr} />
      <Footer message={footerMessage} />
    </div>
  );
};


const ItemInvoice = ({ data }) => {
    const { items, table, section, user, branch } = data;
    let businessInfo = {};
    try {
      const raw = localStorage.getItem('businessInfo');
      businessInfo = raw ? JSON.parse(raw) : {};
    } catch { businessInfo = {}; }
    const sanitizeSymbol = (raw) => {
      const str = String(raw || '').trim();
      const m = str.match(/[$€£₦¥₹₽﷼₺₩₫]/);
      if (m) return m[0];
      const code = (str.split(/\s|-|\|/)[0] || '').toUpperCase().slice(0,3);
      const map = { NGN: '₦', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', INR: '₹' };
      return map[code] || (code && code.length === 3 ? code : '');
    };
    const currency = sanitizeSymbol(businessInfo.currencySymbol || businessInfo.currency || '');
    const fmtMoney = (n) => {
      const num = Number(n || 0);
      if (!Number.isFinite(num)) return `${currency ? currency + ' ' : ''}0.00`;
      const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `${currency ? currency + ' ' : ''}${formatted}`;
    };
    return (
        <div style={styles.container}>
            <TopHeader businessName={businessInfo.name || ''} logoUrl={businessInfo.logoUrl || ''} />
            <Header branch={branch} section={section} />
            <hr style={styles.dashedHr} />
            <div style={styles.section}>
                <h2 style={styles.subHeader}>KITCHEN/BAR ORDER</h2>
                <p><strong>Table:</strong> {table || 'Takeaway'}</p>
                <p><strong>Time:</strong> {new Date().toLocaleTimeString()}</p>
                <p><strong>Staff:</strong> {user}</p>
            </div>
            <hr style={styles.dashedHr} />
            <ItemsTable items={items} showPrice={false} fmtMoney={fmtMoney} />
            <hr style={styles.dashedHr} />
            <Footer message={businessInfo.invoiceFooterNote || ''} />
        </div>
    );
};

const TopHeader = ({ logoUrl }) => (
  <div style={styles.topHeaderWrap}>
    {logoUrl ? (
      <div style={styles.logoRow}><img src={logoUrl} alt="logo" style={styles.logo}/></div>
    ) : null}
  </div>
);

const Header = ({ branch, section }) => {
  let businessInfo = {};
  try {
    const raw = localStorage.getItem('businessInfo');
    businessInfo = raw ? JSON.parse(raw) : {};
  } catch { businessInfo = {}; }
  const branchName = typeof branch === 'string' ? branch : (branch?.name || '');
  const branchLocation = (branch && typeof branch === 'object')
    ? (typeof branch.location === 'string' ? branch.location : (branch?.location?.name || ''))
    : '';
  const sectionName = typeof section === 'string' ? section : (section?.name || section?.label || '');
  return (
    <div style={styles.header}>
      {businessInfo.name && <h1 style={styles.title}>{String(businessInfo.name)}</h1>}
      {businessInfo.address && <p>{String(businessInfo.address)}</p>}
      {(businessInfo.phone || businessInfo.email) && (
        <p>Tel: {String(businessInfo.phone || '')}{businessInfo.phone && businessInfo.email ? ' | ' : ''}Email: {String(businessInfo.email || '')}</p>
      )}
      <hr style={styles.dashedHr} />
      {branch && <p><strong>Branch:</strong> {branchName}{branchLocation ? ` (${branchLocation})` : ''}</p>}
      {sectionName && <p><strong>Section:</strong> {sectionName}</p>}
    </div>
  );
};

const ItemsTable = ({ items, showPrice = true, fmtMoney }) => (
  <table style={styles.table}>
    <thead>
      <tr>
        <th style={styles.th}>ITEM</th>
        <th style={{ ...styles.th, ...styles.center }}>QTY</th>
        {showPrice && <th style={{ ...styles.th, ...styles.right }}>PRICE</th>}
      </tr>
    </thead>
    <tbody>
      {(items || []).map((item, index) => (
        <tr key={index}>
          <td style={styles.td}>{(item?.name || item?.product?.name || item?.title || '')}</td>
          <td style={{ ...styles.td, ...styles.center }}>{Number(item?.qty || 0)}</td>
          {showPrice && <td style={{ ...styles.td, ...styles.right }}>{fmtMoney(Number(item?.price || 0) * Number(item?.qty || 0))}</td>}
        </tr>
      ))}
    </tbody>
  </table>
);

const Totals = ({ items = [], subtotal, discount, tax, total, taxRate, fmtMoney }) => {
  const sumItems = Array.isArray(items)
    ? items.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.qty || 0)), 0)
    : 0;
  const sub = Number.isFinite(Number(sumItems)) ? Number(sumItems) : 0;
  const disc = Number.isFinite(Number(discount)) ? Number(discount) : 0;
  const tx = Number.isFinite(Number(tax)) ? Number(tax) : 0;
  const tot = sub + tx - disc;
  return (
    <div style={styles.section}>
      <div style={styles.flexBetween}>
        <span>Subtotal</span>
        <span>{fmtMoney(sub)}</span>
      </div>
      {Number(disc) > 0 && (
        <div style={styles.flexBetween}>
          <span>Discount</span>
          <span>{`- ${fmtMoney(disc)}`}</span>
        </div>
      )}
      <div style={styles.flexBetween}>
        <span>Tax{Number.isFinite(Number(taxRate)) ? ` (${Number(taxRate)}%)` : ''}</span>
        <span>{fmtMoney(tx)}</span>
      </div>
      <div style={{...styles.flexBetween, ...styles.bold, ...styles.total}}>
        <span>TOTAL</span>
        <span>{fmtMoney(tot)}</span>
      </div>
    </div>
  );
};

const PaymentInfo = ({ paymentDetails, fmtMoney }) => {
  if (!paymentDetails) return null;
  const method = String(paymentDetails.method || '').toLowerCase();

  const renderMultipleDetails = () => {
    // Prefer explicit details if provided
    const fromDetails = paymentDetails?.details || {};
    // Support flat fields (cash/card/bank or pos/transfer)
    const fromFlat = {
      cash: Number(paymentDetails?.cash ?? 0),
      card: Number(paymentDetails?.card ?? (paymentDetails?.pos ?? 0)),
      bank: Number(paymentDetails?.bank ?? (paymentDetails?.transfer ?? 0)),
    };
    // Support entries/payments array [{ method, amount }]
    let fromEntries = { cash: 0, card: 0, bank: 0 };
    const entries = paymentDetails?.entries || paymentDetails?.payments;
    if (Array.isArray(entries)) {
      entries.forEach(e => {
        const m = String(e?.method || '').toLowerCase();
        const amt = Number(e?.amount || 0);
        if (m.includes('cash')) fromEntries.cash += amt;
        else if (m.includes('card') || m.includes('pos')) fromEntries.card += amt;
        else fromEntries.bank += amt;
      });
    }
    const d = {
      cash: Number(fromDetails.cash ?? 0) || fromFlat.cash || fromEntries.cash || 0,
      card: Number(fromDetails.card ?? 0) || fromFlat.card || fromEntries.card || 0,
      bank: Number(fromDetails.bank ?? 0) || fromFlat.bank || fromEntries.bank || 0,
    };
    return (
      <>
        {Number(d.cash) > 0 && (
          <div style={styles.flexBetween}><span>- Cash:</span><span>{fmtMoney(d.cash)}</span></div>
        )}
        {Number(d.card) > 0 && (
          <div style={styles.flexBetween}><span>- Card:</span><span>{fmtMoney(d.card)}</span></div>
        )}
        {Number(d.bank) > 0 && (
          <div style={styles.flexBetween}><span>- Bank Transfer:</span><span>{fmtMoney(d.bank)}</span></div>
        )}
      </>
    );
  };

  return (
    <div style={styles.section}>
      <div style={styles.flexBetween}>
        <span style={styles.bold}>PAYMENT METHOD:</span>
        <span style={styles.bold}>{method.replace(/_/g, ' ').toUpperCase()}</span>
      </div>
      {method === 'cash' && (
        <>
          <div style={styles.flexBetween}>
            <span>Cash Received:</span>
            <span>{fmtMoney(Number(paymentDetails.received || 0))}</span>
          </div>
          <div style={styles.flexBetween}>
            <span>Change:</span>
            <span>{fmtMoney(Number(paymentDetails.change || 0))}</span>
          </div>
        </>
      )}
      {method === 'multiple' && renderMultipleDetails()}
    </div>
  );
};


const Footer = ({ message }) => (
  <div style={styles.footer}>
    {message && <p>{message}</p>}
  </div>
);


const styles = {
  page: {
    padding: '10mm',
    '@media print': {
        padding: '0',
    }
  },
  container: {
    width: '300px',
    margin: '0 auto',
    padding: '16px',
    backgroundColor: '#fff',
    color: '#000',
    fontFamily: 'monospace',
    fontSize: '12px',
    lineHeight: '1.4',
  },
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  topHeaderWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  logoRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  logo: {
    maxWidth: '120px',
    maxHeight: '60px',
    objectFit: 'contain',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
  },
  subHeader: {
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '0',
    padding: '4px 0',
  },
  section: {
    paddingTop: '8px',
    marginTop: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '8px',
    marginBottom: '8px',
  },
  th: {
    textAlign: 'left',
    paddingBottom: '4px',
    borderBottom: '1px solid #000',
  },
  td: {
    padding: '4px 0',
  },
  center: {
    textAlign: 'center',
  },
  right: {
    textAlign: 'right',
  },
  flexBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
  },
  bold: {
    fontWeight: 'bold',
  },
  total: {
    fontSize: '14px',
    marginTop: '4px'
  },
  footer: {
    textAlign: 'center',
    marginTop: '8px',
    paddingTop: '8px',
  },
  developerInfo: {
    marginTop: '8px',
    borderTop: '1px dashed #000',
    paddingTop: '8px',
    color: '#555',
  },
  dashedHr: {
    border: 'none',
    borderTop: '1px dashed #000',
    margin: '8px 0',
  },
};


PrintView.displayName = 'PrintView';
export default PrintView;
