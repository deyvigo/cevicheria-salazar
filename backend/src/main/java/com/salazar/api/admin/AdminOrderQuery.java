package com.salazar.api.admin;

import com.salazar.api.auth.User;
import com.salazar.api.catalogo.NamePattern;
import com.salazar.api.pedidos.CollectionMethod;
import com.salazar.api.pedidos.DeliveryStatus;
import com.salazar.api.pedidos.Order;
import com.salazar.api.pedidos.OrderStatus;
import com.salazar.api.pedidos.PaymentMethod;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Repository;

@Repository
class AdminOrderQuery {
    static final ZoneId LIMA = ZoneId.of("America/Lima");
    private static final List<OrderStatus> PURCHASED = List.of(OrderStatus.PAGADO, OrderStatus.PENDIENTE_COBRO);

    @PersistenceContext
    private EntityManager em;

    record Row(Order order, String customerName) {}

    List<Row> find(AdminOrderFilter filter, AdminOrderSort sort, boolean descending, int offset, int limit) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<Order> order = query.from(Order.class);
        Root<User> user = query.from(User.class);
        query.multiselect(order, user.get("firstName"), user.get("lastName"));
        query.where(predicates(cb, order, user, filter).toArray(Predicate[]::new));
        query.orderBy(orders(cb, order, user, sort, descending));
        return em.createQuery(query)
                .setFirstResult(offset)
                .setMaxResults(limit)
                .getResultList()
                .stream()
                .map(tuple -> new Row(tuple.get(0, Order.class), tuple.get(1, String.class) + " " + tuple.get(2, String.class)))
                .toList();
    }

    long count(AdminOrderFilter filter) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> query = cb.createQuery(Long.class);
        Root<Order> order = query.from(Order.class);
        Root<User> user = query.from(User.class);
        query.select(cb.count(order));
        query.where(predicates(cb, order, user, filter).toArray(Predicate[]::new));
        return em.createQuery(query).getSingleResult();
    }

    List<String> zoneNames() {
        return em.createQuery(
                        "select distinct o.deliveryZoneName from Order o where o.deliveryZoneName is not null"
                                + " and o.status in :statuses order by o.deliveryZoneName",
                        String.class)
                .setParameter("statuses", PURCHASED)
                .getResultList();
    }

    private Expression<Instant> purchasedAt(CriteriaBuilder cb, Root<Order> order) {
        return cb.coalesce(order.<Instant>get("paidAt"), order.<Instant>get("createdAt"));
    }

    private List<Predicate> predicates(CriteriaBuilder cb, Root<Order> order, Root<User> user, AdminOrderFilter filter) {
        List<Predicate> list = new ArrayList<>();
        list.add(cb.equal(user.get("id"), order.get("userId")));
        list.add(order.get("status").in(PURCHASED));

        switch (filter.stage()) {
            case ACTIVE -> list.add(order.get("deliveryStatus")
                    .in(List.of(DeliveryStatus.EN_PREPARACION, DeliveryStatus.EN_CAMINO)));
            case ALL -> {}
            default -> list.add(cb.equal(order.get("deliveryStatus"), filter.stage().single()));
        }
        if (filter.type() != null) list.add(cb.equal(order.get("deliveryType"), filter.type()));
        if (filter.paymentStatus() != null) list.add(cb.equal(order.get("status"), filter.paymentStatus()));
        if (filter.zone() != null) list.add(cb.equal(order.get("deliveryZoneName"), filter.zone()));
        if (filter.payment() != null) {
            list.add(switch (filter.payment()) {
                case ONLINE -> cb.equal(order.get("paymentMethod"), PaymentMethod.ONLINE);
                case EFECTIVO -> cb.equal(order.get("collectionMethod"), CollectionMethod.EFECTIVO);
                case YAPE -> cb.equal(order.get("collectionMethod"), CollectionMethod.YAPE);
            });
        }
        if (filter.from() != null) {
            list.add(cb.greaterThanOrEqualTo(
                    purchasedAt(cb, order), filter.from().atStartOfDay(LIMA).toInstant()));
        }
        if (filter.to() != null) {
            list.add(cb.lessThan(
                    purchasedAt(cb, order), filter.to().plusDays(1).atStartOfDay(LIMA).toInstant()));
        }
        Predicate text = textMatch(cb, order, user, filter.query());
        if (text != null) list.add(text);
        return list;
    }

    // Matches the order number ("SAL-001042", "1042") or the customer's name, ignoring case and accents
    private Predicate textMatch(CriteriaBuilder cb, Root<Order> order, Root<User> user, String raw) {
        String namePattern = NamePattern.from(raw);
        if (namePattern == null) return null;
        String codePattern = NamePattern.from(codeNeedle(raw));
        Expression<String> fullName = cb.concat(cb.concat(cb.lower(user.get("firstName")), " "), cb.lower(user.get("lastName")));
        Predicate byName = cb.like(cb.function("unaccent", String.class, fullName), namePattern, '!');
        if (codePattern == null) return byName;
        return cb.or(cb.like(cb.lower(order.get("code")), codePattern, '!'), byName);
    }

    private String codeNeedle(String raw) {
        String needle = raw.strip().toLowerCase(Locale.ROOT);
        if (needle.startsWith("sal-")) needle = needle.substring(4);
        String trimmed = needle.replaceFirst("^0+(?=.)", "");
        return trimmed.isEmpty() ? needle : trimmed;
    }

    private List<jakarta.persistence.criteria.Order> orders(
            CriteriaBuilder cb, Root<Order> order, Root<User> user, AdminOrderSort sort, boolean descending) {
        List<jakarta.persistence.criteria.Order> result = new ArrayList<>();
        switch (sort) {
            case CODE -> result.add(direction(cb, order.get("code"), descending));
            case DATE -> {}
            case CUSTOMER -> {
                result.add(direction(cb, cb.lower(user.get("lastName")), descending));
                result.add(direction(cb, cb.lower(user.get("firstName")), descending));
            }
            case ZONE -> {
                // Pickup orders have no zone: they go last whichever way the column is sorted
                result.add(cb.asc(cb.selectCase()
                        .when(cb.isNull(order.get("deliveryZoneName")), 1)
                        .otherwise(0)));
                result.add(direction(cb, cb.lower(order.get("deliveryZoneName")), descending));
            }
            case TOTAL -> result.add(direction(cb, order.get("total"), descending));
            case DELIVERYSTATUS -> result.add(direction(
                    cb,
                    cb.selectCase()
                            .when(cb.equal(order.get("deliveryStatus"), DeliveryStatus.EN_PREPARACION), 1)
                            .when(cb.equal(order.get("deliveryStatus"), DeliveryStatus.EN_CAMINO), 2)
                            .otherwise(3),
                    descending));
        }
        // Ties fall back to the newest purchase, then the id, so pages stay stable
        result.add(sort == AdminOrderSort.DATE && !descending ? cb.asc(purchasedAt(cb, order)) : cb.desc(purchasedAt(cb, order)));
        result.add(sort == AdminOrderSort.DATE && !descending ? cb.asc(order.get("id")) : cb.desc(order.get("id")));
        return result;
    }

    private jakarta.persistence.criteria.Order direction(CriteriaBuilder cb, Expression<?> expression, boolean descending) {
        return descending ? cb.desc(expression) : cb.asc(expression);
    }
}
