import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Clock, Receipt, BarChart3, User, Wallet } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarIcon: ({ focused, color }) => {
          // This will be overridden per screen, but needed for type safety
          return null;
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              <Home size={24} color={color} strokeWidth={1.2} />
              {focused && (
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: '#FF6B35',
                    marginTop: 4,
                  }}
                />
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { fontSize: 20, fontWeight: '500', color: '#1A1A1A' },
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              <Clock size={24} color={color} strokeWidth={1.2} />
              {focused && (
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: '#FF6B35',
                    marginTop: 4,
                  }}
                />
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Facturas',
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { fontSize: 20, fontWeight: '500', color: '#1A1A1A' },
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              <Receipt size={24} color={color} strokeWidth={1.2} />
              {focused && (
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: '#FF6B35',
                    marginTop: 4,
                  }}
                />
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reportes',
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { fontSize: 20, fontWeight: '500', color: '#1A1A1A' },
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              <BarChart3 size={24} color={color} strokeWidth={1.2} />
              {focused && (
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: '#FF6B35',
                    marginTop: 4,
                  }}
                />
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Presupuestos',
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              <Wallet size={24} color={color} strokeWidth={1.2} />
              {focused && (
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: '#FF6B35',
                    marginTop: 4,
                  }}
                />
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused, color }) => (
            <View style={{ alignItems: 'center' }}>
              <User size={24} color={color} strokeWidth={1.2} />
              {focused && (
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: '#FF6B35',
                    marginTop: 4,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
