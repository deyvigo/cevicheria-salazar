package com.salazar.api.pedidos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

class OrderCodeGeneratorTest {
    private final OrderRepository repository = mock(OrderRepository.class);
    private final OrderCodeGenerator generator = new OrderCodeGenerator(repository);

    @Test
    void theOrderCodeIsThePrefixAndTheSequenceValuePaddedToSixDigits() {
        when(repository.nextCodeNumber()).thenReturn(1L, 1042L, 123456L);

        assertThat(generator.nextOrderCode()).isEqualTo("SAL-000001");
        assertThat(generator.nextOrderCode()).isEqualTo("SAL-001042");
        assertThat(generator.nextOrderCode()).isEqualTo("SAL-123456");
    }

    @Test
    void theDeliveryCodeIsAlwaysFourDigitsIncludingLeadingZeros() {
        for (int i = 0; i < 2_000; i++) {
            assertThat(generator.nextDeliveryCode()).matches("[0-9]{4}");
        }
    }
}
