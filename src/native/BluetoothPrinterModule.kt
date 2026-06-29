package com.sindicatotrans.nativemodules

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.OutputStream
import java.util.UUID

/**
 * MÓDULO NATIVO DE KOTLIN (ANDROID)
 * Conexión e impresión directa en tiqueteras térmicas Bluetooth POS (ESC/POS)
 * Evita la sobrecarga del puente JavaScript.
 */
class BluetoothPrinterModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var outputStream: OutputStream? = null
    private var socket: BluetoothSocket? = null

    override fun getName(): String {
        return "BluetoothPrinter"
    }

    @ReactMethod
    fun printTicket(macAddress: String, ticketContent: String, promise: Promise) {
        try {
            val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
            if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
                promise.reject("BT_DISABLED", "El adaptador Bluetooth está apagado.")
                return
            }

            val device: BluetoothDevice = bluetoothAdapter.getRemoteDevice(macAddress)
            val uuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB") // SPP UUID standard
            
            socket = device.createRfcommSocketToServiceRecord(uuid)
            socket?.connect()
            outputStream = socket?.outputStream

            // Comandos ESC/POS de impresión (Bytes directos para rendimiento óptimo)
            val printFormat = byteArrayOf(0x1B, 0x21, 0x00) // Reset formato
            val boldFormat = byteArrayOf(0x1B, 0x21, 0x08) // Negrita
            val centerAlign = byteArrayOf(0x1B, 0x61, 0x01) // Centrar

            outputStream?.write(centerAlign)
            outputStream?.write(boldFormat)
            outputStream?.write("SINDICATO TRANS\n".toByteArray())
            outputStream?.write("BOLETO DIGITAL\n\n".toByteArray())
            
            outputStream?.write(printFormat)
            outputStream?.write(ticketContent.toByteArray())
            outputStream?.write("\n\n\n".toByteArray()) // Margen de corte

            outputStream?.flush()
            outputStream?.close()
            socket?.close()

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PRINT_ERROR", "Error de impresión nativa: " + e.localizedMessage, e)
        }
    }
}
