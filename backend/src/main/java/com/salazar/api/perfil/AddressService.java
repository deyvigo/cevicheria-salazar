package com.salazar.api.perfil;

import com.salazar.api.auth.User;
import com.salazar.api.auth.UserRepository;
import com.salazar.api.auth.UserRole;
import com.salazar.api.common.exception.AddressLimitReachedException;
import com.salazar.api.common.exception.AddressNotFoundException;
import com.salazar.api.perfil.dto.AddressRequest;
import com.salazar.api.perfil.dto.AddressResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AddressService {
    static final int MAX_ADDRESSES = 10;

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AddressResponse> list(Long userId) {
        requireCustomer(userRepository.findById(userId).orElse(null));
        return addressRepository.findAllByUserIdAndDeletedAtIsNullOrderByCreatedAtDescIdDesc(userId).stream()
                .map(AddressResponse::from)
                .toList();
    }

    @Transactional
    public AddressResponse create(Long userId, AddressRequest request) {
        // Row lock so two concurrent requests cannot both pass the limit check
        requireCustomer(userRepository.findByIdForUpdate(userId).orElse(null));
        if (addressRepository.countByUserIdAndDeletedAtIsNull(userId) >= MAX_ADDRESSES) {
            throw new AddressLimitReachedException(MAX_ADDRESSES);
        }
        Address address = new Address(
                userId,
                request.label(),
                request.address(),
                request.reference(),
                request.latitude(),
                request.longitude());
        return AddressResponse.from(addressRepository.save(address));
    }

    @Transactional
    public AddressResponse update(Long userId, Long id, AddressRequest request) {
        requireCustomer(userRepository.findById(userId).orElse(null));
        Address address = find(userId, id);
        address.update(
                request.label(), request.address(), request.reference(), request.latitude(), request.longitude());
        return AddressResponse.from(address);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        requireCustomer(userRepository.findById(userId).orElse(null));
        find(userId, id).markDeleted();
    }

    private Address find(Long userId, Long id) {
        return addressRepository
                .findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(AddressNotFoundException::new);
    }

    private void requireCustomer(User user) {
        if (user == null || !user.isActive()) {
            throw new InsufficientAuthenticationException("Usuario no encontrado.");
        }
        if (user.getRole() != UserRole.CLIENTE) {
            throw new AccessDeniedException("Solo los clientes tienen direcciones.");
        }
    }
}
