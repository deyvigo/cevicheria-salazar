-- Sales report: revenue is grouped by the date the money came in
CREATE INDEX idx_orders_report_paid ON orders (paid_at) WHERE status = 'PAGADO';
