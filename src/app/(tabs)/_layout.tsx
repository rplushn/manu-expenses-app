import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Clock, Receipt, BarChart3, User, Wallet } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6B2C',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '300',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => (
            <Home size={18} color={color} strokeWidth={1.2} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color }) => (
            <Clock size={18} color={color} strokeWidth={1.2} />
          ),
        }}
      />

      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Facturas',
          tabBarIcon: ({ color }) => (
            <Receipt size={18} color={color} strokeWidth={1.2} />
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color }) => (
            <BarChart3 size={18} color={color} strokeWidth={1.2} />
          ),
        }}
      />

      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Presupuestos',
          tabBarIcon: ({ color }) => (
            <Wallet size={18} color={color} strokeWidth={1.2} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <User size={18} color={color} strokeWidth={1.2} />
          ),
        }}
      />
    </Tabs>
  );
}
