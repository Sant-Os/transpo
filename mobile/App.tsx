import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Font from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme/colors';

// Import Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import SecretaryPosScreen from './src/screens/secretary/SecretaryPosScreen';
import DriverDashboardScreen from './src/screens/driver/DriverDashboardScreen';
import SocioDashboardScreen from './src/screens/socio/SocioDashboardScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import ChatScreen from './src/screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState<boolean>(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.background },
          }}
          initialRouteName="Login"
        >
          <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="SecretaryPOS" component={SecretaryPosScreen} />
          <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
          <Stack.Screen name="SocioDashboard" component={SocioDashboardScreen} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          <Stack.Screen name="Scanner" component={ScannerScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ animation: 'slide_from_right' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
