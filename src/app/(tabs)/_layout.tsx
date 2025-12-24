import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { Home, Clock, FileText, BarChart2, User } from 'lucide-react-native';

interface TabIconProps {
  focused: boolean;
  icon: React.ReactNode;
  label: string;
}

function TabIcon({ focused, icon, label }: TabIconProps) {
  return (
    <View
      className="items-center justify-center pt-1"
      style={{ width: 70 }}
    >
      {icon}
      <Text
        numberOfLines={2}
        style={{
          marginTop: 4,
          fontSize: 11,
          lineHeight: 12,
          textAlign: 'center',
          color: '#FFFFFF',
          fontWeight: focused ? '600' : '500',
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={
                <Home
                  size={24}
                  strokeWidth={1.5}
                  color={focused ? '#FF6B1A' : 'rgba(255,255,255,0.7)'}
                />
              }
              label="Inicio"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={
                <Clock
                  size={24}
                  strokeWidth={1.5}
                  color={focused ? '#FF6B1A' : 'rgba(255,255,255,0.7)'}
                />
              }
              label="Historial"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="invoices"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={
                <FileText
                  size={24}
                  strokeWidth={1.5}
                  color={focused ? '#FF6B1A' : 'rgba(255,255,255,0.7)'}
                />
              }
              label="Facturas"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={
                <BarChart2
                  size={24}
                  strokeWidth={1.5}
                  color={focused ? '#FF6B1A' : 'rgba(255,255,255,0.7)'}
                />
              }
              label="Reportes"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={
                <User
                  size={24}
                  strokeWidth={1.5}
                  color={focused ? '#FF6B1A' : 'rgba(255,255,255,0.7)'}
                />
              }
              label="Perfil"
            />
          ),
        }}
      />
    </Tabs>
  );
}
