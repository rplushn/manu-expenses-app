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
          fontSize: 10,
          lineHeight: 12,
          textAlign: 'center',
          color: focused ? '#111111' : '#9CA3AF',
          fontWeight: focused ? '500' : '400',
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
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: 70,
          paddingBottom: 6,
          paddingTop: 4,
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
                  color={focused ? '#000000' : '#999999'}
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
                  color={focused ? '#000000' : '#999999'}
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
                  color={focused ? '#000000' : '#999999'}
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
                  color={focused ? '#000000' : '#999999'}
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
                  color={focused ? '#000000' : '#999999'}
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
