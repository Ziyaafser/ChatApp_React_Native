import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { auth, db } from './firebase';
import ChatListScreen from './screens/ChatListScreen';
import ChatRoomScreen from './screens/ChatRoomScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import RegisterScreen from './screens/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [hasProfile, setHasProfile] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);

      if (authUser) {
        const profileRef = doc(db, 'users', authUser.uid);
        const profileSnap = await getDoc(profileRef);
        setHasProfile(profileSnap.exists());
      } else {
        setHasProfile(null);
      }

      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : hasProfile ? (
          <>
            <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'ChatApp' }} />
            <Stack.Screen
              name="ChatRoom"
              component={ChatRoomScreen}
              options={({ route }) => ({ title: route.params.otherUser.username })}
            />
          </>
        ) : (
          <Stack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
