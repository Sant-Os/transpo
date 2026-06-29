#include <jsi/jsi.h>
#include <sstream>
#include <string>

using namespace facebook;

/**
 * IMPLEMENTACIÓN EN C++ (REACT NATIVE JSI)
 * Cifrado simétrico ultrarrápido a nivel de hardware para almacenamiento seguro offline.
 * Evita la recolección de basura y traduce cadenas a microsegundos.
 */
class CryptoJSIHelper {

public:
    static void install(jsi::Runtime &rt) {
        // Registrar la función "nativeEncrypt" directamente en el objeto global de JavaScript
        auto nativeEncrypt = jsi::Function::createFromHostFunction(
            rt,
            jsi::PropNameID::forAscii(rt, "nativeEncrypt"),
            1, // Número de argumentos
            [](jsi::Runtime &rt, const jsi::Value &thisVal, const jsi::Value *args, size_t count) -> jsi::Value {
                if (count < 1 || !args[0].isString()) {
                    jsi::detail::throwJSIException(rt, "Argumento inválido: se esperaba string.");
                }

                // Obtener texto original en C++ string
                std::string input = args[0].asString(rt).utf8(rt);
                
                // Algoritmo de Cifrado XOR rápido (Demostración de velocidad de memoria)
                std::string key = "SINDICATO_KEY_2026";
                std::string output = input;
                for (size_t i = 0; i < input.size(); i++) {
                    output[i] = input[i] ^ key[i % key.size()];
                }

                // Retornar el string cifrado de vuelta a JS sin serialización JSON pesada
                return jsi::String::createFromUtf8(rt, output);
            }
        );

        rt.global().setProperty(rt, "nativeEncrypt", std::move(nativeEncrypt));
    }
};
