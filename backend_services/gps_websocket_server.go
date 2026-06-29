package main

import (
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
)

// GPSMessage representa las coordenadas enviadas por el chofer
type GPSMessage struct {
	DriverID  int64   `json:"driver_id"`
	TripID    int64   `json:"trip_id"`
	Plate     string  `json:"plate"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// Hub gestiona todos los clientes conectados (Admins y Socios)
type Hub struct {
	clients    map[chan []byte]bool
	broadcast  chan []byte
	register   chan chan []byte
	unregister chan chan []byte
	mutex      sync.Mutex
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[chan []byte]bool),
		broadcast:  make(chan []byte),
		register:   make(chan chan []byte),
		unregister: make(chan chan []byte),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Println("Nuevo administrador/socio conectado al monitor de mapas.")
		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client)
			}
			h.mutex.Unlock()
			log.Println("Cliente desconectado del monitor.")
		case message := <-h.broadcast:
			h.mutex.Lock()
			for client := range h.clients {
				select {
				case client <- message:
				default:
					close(client)
					delete(h.clients, client)
				}
			}
			h.mutex.Unlock()
		}
	}
}

// gpsPostHandler recibe las coordenadas HTTPS enviadas por el chofer offline/online
func (h *Hub) gpsPostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var msg GPSMessage
	err := json.NewDecoder(r.Body).Decode(&msg)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Serializar para retransmitir
	payload, _ := json.Marshal(msg)
	
	// Enviar a todos los mapas en tiempo real (Canal broadcast)
	h.broadcast <- payload

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"coordenadas_retransmitidas"}`))
}

// wsHandler realiza el handshake manual del protocolo WebSocket (RFC 6455)
func (h *Hub) wsHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Validar cabeceras de Upgrade
	if r.Header.Get("Upgrade") != "websocket" {
		http.Error(w, "Se requiere WebSocket", http.StatusBadRequest)
		return
	}
	key := r.Header.Get("Sec-WebSocket-Key")
	if key == "" {
		http.Error(w, "Falta Sec-WebSocket-Key", http.StatusBadRequest)
		return
	}

	// 2. Calcular firma Sec-WebSocket-Accept
	hKey := sha1.New()
	io.WriteString(hKey, key+"258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
	acceptVal := base64.StdEncoding.EncodeToString(hKey.Sum(nil))

	// Secuestrar conexión TCP
	hj, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "Servidor no soporta hijacking de conexión", http.StatusInternalServerError)
		return
	}
	conn, bufrw, err := hj.Hijack()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	// 3. Escribir respuesta HTTP 101 Switching Protocols
	bufrw.WriteString("HTTP/1.1 101 Switching Protocols\r\n")
	bufrw.WriteString("Upgrade: websocket\r\n")
	bufrw.WriteString("Connection: Upgrade\r\n")
	bufrw.WriteString("Sec-WebSocket-Accept: " + acceptVal + "\r\n\r\n")
	bufrw.Flush()

	// 4. Registrar canal cliente
	clientChan := make(chan []byte, 256)
	h.register <- clientChan

	log.Println("Administrador conectado exitosamente por WebSocket.")

	// Escuchar desconexión del cliente en segundo plano
	go func() {
		buf := make([]byte, 1024)
		for {
			_, err := conn.Read(buf)
			if err != nil {
				h.unregister <- clientChan
				return
			}
		}
	}()

	// 5. Loop de retransmisión de coordenadas
	for msg := range clientChan {
		err := sendTextFrame(bufrw, msg)
		if err != nil {
			log.Println("Error escribiendo frame WebSocket:", err)
			break
		}
		bufrw.Flush()
	}
}

// sendTextFrame escribe un frame de texto WebSocket (RFC 6455) unifragmentado sin máscara
func sendTextFrame(w io.Writer, payload []byte) error {
	length := len(payload)
	var header []byte
	
	if length < 126 {
		header = []byte{0x81, byte(length)}
	} else if length <= 65535 {
		header = []byte{0x81, 126, byte(length >> 8), byte(length & 0xFF)}
	} else {
		return fmt.Errorf("payload demasiado grande para el búfer del mapa")
	}

	if _, err := w.Write(header); err != nil {
		return err
	}
	_, err := w.Write(payload)
	return err
}

func main() {
	fmt.Println("🚀 Servidor Go WebSocket GPS iniciado en el puerto :8082")
	hub := newHub()
	go hub.run()

	// Endpoint REST que recibe el payload GPS del chofer
	http.HandleFunc("/api/gps", hub.gpsPostHandler)
	// Endpoint WebSocket para monitorizar en tiempo real
	http.HandleFunc("/ws", hub.wsHandler)

	log.Fatal(http.ListenAndServe(":8082", nil))
}
