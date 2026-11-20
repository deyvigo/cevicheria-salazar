package com.salazar.api.common.mail;

/** A milestone of an order, already worded, so this package knows nothing about orders. */
public record OrderStatusMail(String to, String firstName, String orderCode, String message) {}
