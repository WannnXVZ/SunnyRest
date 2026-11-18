// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IArsipTarget {
    function tarikBiaya(address payable tujuan) external;
    function kembalikanBiaya(uint256 requestId) external;
    function ajukanRestorasi(uint256 parentId) external payable returns (uint256);
}

/**
 * @title PenyerangReentrancy
 * @notice Kontrak uji keamanan untuk memverifikasi proteksi ReentrancyGuard pada penarikan biaya.
 */
contract PenyerangReentrancy {
    IArsipTarget public immutable target;
    uint256 public jumlahSerangan;
    bool public serangAktif;

    constructor(address _target) {
        target = IArsipTarget(_target);
    }

    function ajukanDenganKontrak(uint256 parentId) external payable returns (uint256) {
        return target.ajukanRestorasi{value: msg.value}(parentId);
    }

    function mulaiSerangTarikBiaya() external {
        serangAktif = true;
        target.tarikBiaya(payable(address(this)));
    }

    receive() external payable {
        jumlahSerangan++;
        if (serangAktif && jumlahSerangan == 1) {
            // Mencoba memanggil ulang tarikBiaya saat penarikan masih berlangsung
            try target.tarikBiaya(payable(address(this))) {} catch {}
        }
    }
}

/**
 * @title PenerimaMenolakETH
 * @notice Kontrak penerima yang selalu menolak transfer ETH masuk untuk menguji TransferGagal.
 */
contract PenerimaMenolakETH {
    IArsipTarget public immutable target;

    constructor(address _target) {
        target = IArsipTarget(_target);
    }

    function ajukanLaluTolakRefund(uint256 parentId) external payable returns (uint256) {
        return target.ajukanRestorasi{value: msg.value}(parentId);
    }

    receive() external payable {
        revert("Menolak ETH masuk");
    }
}
