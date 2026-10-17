package com.salazar.api.perfil;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.auth.UserRole;
import com.salazar.api.common.exception.AddressLimitReachedException;
import com.salazar.api.common.exception.AddressNotFoundException;
import com.salazar.api.perfil.dto.AddressRequest;
import com.salazar.api.perfil.dto.AddressResponse;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class AddressServiceTest {
    private static final long USER_ID = 7L;

    @Mock
    private AddressRepository addressRepository;

    @Mock
    private UserRepository userRepository;

    private AddressService service() {
        return new AddressService(addressRepository, userRepository);
    }

    private User customer() {
        return new User("maria@correo.com", "hash", "María", "Quispe", "987654321", UserRole.CLIENTE);
    }

    private AddressRequest request(String reference) {
        return new AddressRequest(
                " Casa ", " Av. Arequipa 123 ", reference, new BigDecimal("-12.04641234567"), new BigDecimal("-77.0428"));
    }

    @Test
    void requestTrimsTextRoundsCoordinatesAndTurnsABlankReferenceIntoNull() {
        AddressRequest request = request("   ");

        assertThat(request.label()).isEqualTo("Casa");
        assertThat(request.address()).isEqualTo("Av. Arequipa 123");
        assertThat(request.reference()).isNull();
        assertThat(request.latitude()).isEqualByComparingTo("-12.046412");
        assertThat(request.latitude().scale()).isEqualTo(6);
    }

    @Test
    void createsAnAddressForTheUser() {
        when(userRepository.findByIdForUpdate(USER_ID)).thenReturn(Optional.of(customer()));
        when(addressRepository.countByUserIdAndDeletedAtIsNull(USER_ID)).thenReturn(0L);
        when(addressRepository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AddressResponse response = service().create(USER_ID, request("Frente al parque"));

        assertThat(response.label()).isEqualTo("Casa");
        assertThat(response.reference()).isEqualTo("Frente al parque");
    }

    @Test
    void failsWhenTheUserAlreadyHasTheMaximum() {
        when(userRepository.findByIdForUpdate(USER_ID)).thenReturn(Optional.of(customer()));
        when(addressRepository.countByUserIdAndDeletedAtIsNull(USER_ID)).thenReturn(10L);

        assertThatThrownBy(() -> service().create(USER_ID, request(null)))
                .isInstanceOf(AddressLimitReachedException.class);
        verify(addressRepository, never()).save(any());
    }

    @Test
    void updatesAnOwnedAddress() {
        Address address = new Address(USER_ID, "Casa", "Calle 1", null, BigDecimal.ONE, BigDecimal.ONE);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(customer()));
        when(addressRepository.findByIdAndUserIdAndDeletedAtIsNull(3L, USER_ID)).thenReturn(Optional.of(address));

        AddressResponse response = service().update(USER_ID, 3L, request("Puerta azul"));

        assertThat(response.address()).isEqualTo("Av. Arequipa 123");
        assertThat(address.getReference()).isEqualTo("Puerta azul");
    }

    @Test
    void updatingOrDeletingAMissingAddressFails() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(customer()));
        when(addressRepository.findByIdAndUserIdAndDeletedAtIsNull(3L, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().update(USER_ID, 3L, request(null)))
                .isInstanceOf(AddressNotFoundException.class);
        assertThatThrownBy(() -> service().delete(USER_ID, 3L)).isInstanceOf(AddressNotFoundException.class);
    }

    @Test
    void deleteMarksTheRowInsteadOfRemovingIt() {
        Address address = new Address(USER_ID, "Casa", "Calle 1", null, BigDecimal.ONE, BigDecimal.ONE);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(customer()));
        when(addressRepository.findByIdAndUserIdAndDeletedAtIsNull(3L, USER_ID)).thenReturn(Optional.of(address));

        service().delete(USER_ID, 3L);

        assertThat(address.getDeletedAt()).isNotNull();
        verify(addressRepository, never()).delete(any(Address.class));
    }

    @Test
    void anAdministratorIsDenied() {
        User admin = new User("admin@correo.com", "hash", "Rosa", "Salazar", "987654321", UserRole.ADMINISTRADOR);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service().list(USER_ID)).isInstanceOf(AccessDeniedException.class);
    }
}
