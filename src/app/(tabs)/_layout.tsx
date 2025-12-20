import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { Home, Clock, BarChart2, User } from 'lucide-react-native';

interface TabIconProps {
  focused: boolean;
  icon: React.ReactNode;
  label: string;
}

function TabIcon({ focused, icon, label }: TabIconProps) {
  return (
    <View className="items-center justify-center pt-2">
      {icon}
      <Text
        className="text-[11px] mt-1"
        style={{
          color: focused ? '#000000' : '#999999',
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
          height: 80,
          paddingBottom: 20,
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
