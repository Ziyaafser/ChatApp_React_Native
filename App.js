import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { auth } from './firebase';

import ChatListScreen from './screens/ChatListScreen';
import ChatRoomScreen from './screens/ChatRoomScreen';
import CreateGroupScreen from './screens/CreateGroupScreen';
import GroupChatScreen from './screens/GroupChatScreen';
import GroupInfoScreen from './screens/GroupInfoScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import RegisterScreen from './screens/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#3483FA' },
            headerTintColor: '#fff',
            headerTitleAlign: 'center',
            headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
          }}
        >
          {!user ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{title: 'OC Messenger'}}/>
              <Stack.Screen name="Register" component={RegisterScreen} options={{title: 'OC Messenger'}} />
            </>
          ) : (
            <>
              <Stack.Screen name="ChatList" component={ChatListScreen} options={{title: 'OC Messenger'}}/>
              <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
              <Stack.Screen name="GroupChat" component={GroupChatScreen} />
              <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{title: 'OC Messenger'}}/>
              <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{title: 'OC Messenger'}}/>
              <Stack.Screen name="GroupInfo" component={GroupInfoScreen} options={{title: 'Group Info'}}/>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
