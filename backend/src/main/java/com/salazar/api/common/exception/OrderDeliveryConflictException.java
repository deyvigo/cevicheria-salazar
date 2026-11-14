package com.salazar.api.common.exception;

public class OrderDeliveryConflictException extends RuntimeException {
    public OrderDeliveryConflictException(String message) {
        super(message);
    }
}
