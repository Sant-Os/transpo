import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Font from 'expo-font';
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import Screens (to be created)
import LoginScreen from './src/screens/auth/LoginScreen';
import SecretaryPosScreen from './src/screens/secretary/SecretaryPosScreen';
import DriverDashboardScreen from './src/screens/driver/DriverDashboardScreen';
import SocioDashboardScreen from './src/screens/socio/SocioDashboardScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import ChatScreen from './src/screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        JetBrainsMono_400Regular,
        JetBrainsMono_700Bold,
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SecretaryPOS" component={SecretaryPosScreen} />
          <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
          <Stack.Screen name="SocioDashboard" component={SocioDashboardScreen} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          <Stack.Screen name="Scanner" component={ScannerScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
