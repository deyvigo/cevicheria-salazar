package com.salazar.api.admin;

import com.salazar.api.admin.dto.SalesReport.Dish;
import com.salazar.api.admin.dto.SalesReport.Granularity;
import com.salazar.api.pedidos.DeliveryType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Repository;

/** Aggregates in the database; the SQL only ever embeds fixed literals, every caller value is a bound parameter. */
@Repository
class AdminReportQuery {
    private static final String LIMA = "America/Lima";
    // An online order that was rejected or cancelled stays PAGADO with a pending refund, but the money goes back
    private static final String SALE = "o.status = 'PAGADO' AND o.delivery_status NOT IN ('RECHAZADO', 'CANCELADO')"
            + " AND o.paid_at >= :start AND o.paid_at < :end";
    // Cash on delivery that ended badly keeps PENDIENTE_COBRO, but it was never collected
    private static final String TO_COLLECT = "o.status = 'PENDIENTE_COBRO'"
            + " AND o.delivery_status NOT IN ('RECHAZADO', 'CANCELADO', 'FALLIDO')"
            + " AND o.created_at >= :start AND o.created_at < :end";
    private static final String REFUND = "o.refund_status = 'PENDIENTE'";

    @PersistenceContext
    private EntityManager em;

    @SuppressWarnings("unchecked")
    private static List<Object[]> rows(Query query) {
        return query.getResultList();
    }

    record Bucket(LocalDate date, BigDecimal revenue, long orders) {}

    record MethodTotal(String method, BigDecimal revenue, long orders) {}

    record SalesTotals(BigDecimal revenue, long orders, BigDecimal discounts) {}

    record Amount(BigDecimal amount, long count) {}

    List<Bucket> series(Granularity granularity, Filters filters) {
        String day = "(o.paid_at AT TIME ZONE '" + LIMA + "')";
        String bucket = switch (granularity) {
            case DAY -> day + "::date";
            case WEEK -> "date_trunc('week', " + day + ")::date";
            case MONTH -> "date_trunc('month', " + day + ")::date";
        };
        Query query = em.createNativeQuery("SELECT to_char(" + bucket + ", 'YYYY-MM-DD'), SUM(o.total), COUNT(*)"
                + " FROM orders o WHERE " + SALE + filters.sql() + " GROUP BY 1 ORDER BY 1");
        return rows(filters.bind(query)).stream()
                .map(row -> new Bucket(LocalDate.parse((String) row[0]), (BigDecimal) row[1], ((Number) row[2]).longValue()))
                .toList();
    }

    List<MethodTotal> byMethod(Filters filters) {
        Query query = em.createNativeQuery(
                "SELECT CASE WHEN o.payment_method = 'ONLINE' THEN 'ONLINE' ELSE o.collection_method END,"
                        + " SUM(o.total), COUNT(*) FROM orders o WHERE " + SALE + filters.sql() + " GROUP BY 1");
        return rows(filters.bind(query)).stream()
                .map(row -> new MethodTotal((String) row[0], (BigDecimal) row[1], ((Number) row[2]).longValue()))
                .toList();
    }

    SalesTotals totals(Filters filters) {
        Query query = em.createNativeQuery("SELECT COALESCE(SUM(o.total), 0), COUNT(*), COALESCE(SUM(o.discount), 0)"
                + " FROM orders o WHERE " + SALE + filters.sql());
        Object[] row = (Object[]) filters.bind(query).getSingleResult();
        return new SalesTotals((BigDecimal) row[0], ((Number) row[1]).longValue(), (BigDecimal) row[2]);
    }

    BigDecimal pendingCollection(Filters filters) {
        Query query = em.createNativeQuery(
                "SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE " + TO_COLLECT + filters.sql());
        return (BigDecimal) filters.bind(query).getSingleResult();
    }

    Amount pendingRefunds(Filters filters) {
        Query query = em.createNativeQuery(
                "SELECT COALESCE(SUM(o.total), 0), COUNT(*) FROM orders o WHERE " + REFUND + filters.sql());
        Object[] row = (Object[]) filters.bind(query).getSingleResult();
        return new Amount((BigDecimal) row[0], ((Number) row[1]).longValue());
    }

    List<Dish> topDishes(Filters filters, int limit) {
        Query query = em.createNativeQuery("SELECT i.product_name, SUM(i.quantity), SUM(i.line_total)"
                + " FROM order_items i JOIN orders o ON o.id = i.order_id WHERE " + SALE + filters.sql()
                + " GROUP BY i.product_name ORDER BY SUM(i.quantity) DESC, SUM(i.line_total) DESC, i.product_name"
                + " LIMIT " + limit);
        return rows(filters.bind(query)).stream()
                .map(row -> new Dish((String) row[0], ((Number) row[1]).longValue(), (BigDecimal) row[2]))
                .toList();
    }

    /** The range is in Lima days, end exclusive; {@code payment} and {@code type} are optional. */
    record Filters(LocalDate from, LocalDate to, AdminOrderFilter.Payment payment, DeliveryType type) {
        private Instant start() {
            return from.atStartOfDay(AdminOrderQuery.LIMA).toInstant();
        }

        private Instant end() {
            return to.plusDays(1).atStartOfDay(AdminOrderQuery.LIMA).toInstant();
        }

        String sql() {
            StringBuilder sql = new StringBuilder();
            if (payment != null) {
                sql.append(switch (payment) {
                    case ONLINE -> " AND o.payment_method = 'ONLINE'";
                    case EFECTIVO -> " AND o.payment_method = 'CONTRAENTREGA' AND o.collection_method = 'EFECTIVO'";
                    case YAPE -> " AND o.payment_method = 'CONTRAENTREGA' AND o.collection_method = 'YAPE'";
                });
            }
            if (type != null) {
                sql.append(" AND o.delivery_type = :type");
            }
            return sql.toString();
        }

        Query bind(Query query) {
            if (query.getParameters().stream().anyMatch(parameter -> "start".equals(parameter.getName()))) {
                query.setParameter("start", start());
                query.setParameter("end", end());
            }
            if (type != null) {
                query.setParameter("type", type.name());
            }
            return query;
        }
    }
}
