package com.salazar.api.admin;

import com.salazar.api.pedidos.OrderChangedEvent;
import java.io.IOException;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicLong;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.SmartLifecycle;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Tells every open admin panel that its orders table is out of date. Carries ids only, never order data.
 * The last events are kept in memory so a panel that reconnects (the browser sends Last-Event-ID) gets the ones it missed.
 */
@Service
@Slf4j
public class AdminOrderEventsService implements SmartLifecycle {
    private static final Duration TIMEOUT = Duration.ofMinutes(30);
    private static final int HISTORY_SIZE = 200;

    private record Event(long id, String name, String data) {}

    /** One writer thread per panel: a slow or stuck connection can only delay itself, never the request that confirmed the order. */
    private static final class Subscriber {
        private final SseEmitter emitter = new SseEmitter(TIMEOUT.toMillis());
        private final ExecutorService writer = Executors.newSingleThreadExecutor(Thread.ofVirtual().name("admin-orders-sse").factory());
    }

    private final Object lock = new Object();
    private final List<Subscriber> subscribers = new ArrayList<>();
    private final Deque<Event> history = new ArrayDeque<>();
    // Starts at the boot time so ids never go backwards across restarts: a stale Last-Event-ID simply replays nothing
    private final AtomicLong sequence = new AtomicLong(System.currentTimeMillis() * 1000);
    private volatile boolean running;

    public SseEmitter subscribe(String lastEventId) {
        Subscriber subscriber = new Subscriber();
        Runnable remove = () -> remove(subscriber);
        subscriber.emitter.onCompletion(remove);
        subscriber.emitter.onTimeout(remove);
        subscriber.emitter.onError(error -> remove.run());
        long after = parse(lastEventId);
        // Replay and registration happen together so no event falls between them
        synchronized (lock) {
            // Flushes the headers so the browser fires "open" right away
            send(subscriber, SseEmitter.event().comment("connected"));
            if (after > 0) {
                history.stream()
                        .filter(event -> event.id() > after)
                        .forEach(event -> send(subscriber, toSse(event)));
            }
            subscribers.add(subscriber);
        }
        return subscriber.emitter;
    }

    // Fallback runs the listener when there is no transaction, so a change is never silently dropped
    @TransactionalEventListener(fallbackExecution = true)
    public void onOrderChanged(OrderChangedEvent event) {
        String name = event.type() == OrderChangedEvent.Type.CREATED ? "pedido-creado" : "pedido-actualizado";
        Event next = new Event(sequence.incrementAndGet(), name, "{\"orderId\":" + event.orderId() + "}");
        synchronized (lock) {
            history.addLast(next);
            if (history.size() > HISTORY_SIZE) history.removeFirst();
            // Only queues the write on each panel's own thread, so nothing slow happens while holding the lock
            subscribers.forEach(subscriber -> send(subscriber, toSse(next)));
        }
    }

    // Proxies close idle connections: a comment line keeps the stream alive without waking the client
    @Scheduled(fixedRate = 25_000)
    public void keepAlive() {
        List<Subscriber> targets;
        synchronized (lock) {
            targets = List.copyOf(subscribers);
        }
        targets.forEach(subscriber -> send(subscriber, SseEmitter.event().comment("keepalive")));
    }

    // The graceful shutdown of the web server waits for open requests, and an event stream never ends by itself.
    // This lifecycle has the highest phase, so it stops first and closes the streams before that wait starts.
    @Override
    public void start() {
        running = true;
    }

    @Override
    public void stop() {
        running = false;
        List<Subscriber> all;
        synchronized (lock) {
            all = List.copyOf(subscribers);
            subscribers.clear();
        }
        all.forEach(subscriber -> {
            subscriber.writer.execute(subscriber.emitter::complete);
            subscriber.writer.shutdown();
        });
    }

    @Override
    public boolean isRunning() {
        return running;
    }

    @Override
    public int getPhase() {
        return Integer.MAX_VALUE;
    }

    private SseEmitter.SseEventBuilder toSse(Event event) {
        return SseEmitter.event().id(String.valueOf(event.id())).name(event.name()).data(event.data());
    }

    private void send(Subscriber subscriber, SseEmitter.SseEventBuilder event) {
        try {
            subscriber.writer.execute(() -> {
                try {
                    subscriber.emitter.send(event);
                } catch (IOException | IllegalStateException e) {
                    remove(subscriber);
                }
            });
        } catch (RejectedExecutionException e) {
            remove(subscriber);
        }
    }

    private void remove(Subscriber subscriber) {
        synchronized (lock) {
            subscribers.remove(subscriber);
        }
        subscriber.writer.shutdown();
    }

    private long parse(String lastEventId) {
        try {
            return lastEventId == null ? 0 : Long.parseLong(lastEventId.strip());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
