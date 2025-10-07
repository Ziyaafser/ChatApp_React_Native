import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import {
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from 'react-native';
import { auth } from '../firebase';

export default function RegisterScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const colors = {
    background: isDarkMode ? '#121212' : '#FFFFFF',
    primaryText: isDarkMode ? '#FFFFFF' : '#000000',
    secondaryText: isDarkMode ? '#BBBBBB' : '#999999',
    border: isDarkMode ? '#2A2A2A' : '#ccc',
    inputBg: isDarkMode ? '#1E1E1E' : '#F9F9F9',
    accent: '#3483FA',
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* 🔹 Logo Area */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/Otalk_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.title, { color: colors.primaryText }]}>Register</Text>

        {error ? <Text style={[styles.error, { color: 'red' }]}>{error}</Text> : null}

        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.inputBg,
              color: colors.primaryText,
            },
          ]}
          placeholder="Email"
          placeholderTextColor={colors.secondaryText}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          value={email}
        />

        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.inputBg,
              color: colors.primaryText,
            },
          ]}
          placeholder="Password"
          placeholderTextColor={colors.secondaryText}
          secureTextEntry
          onChangeText={setPassword}
          value={password}
        />

        <TouchableOpacity
          style={[styles.registerButton, { backgroundColor: colors.accent }]}
          onPress={handleRegister}
        >
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.link, { color: colors.accent }]}>
            Already have an account? Login
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 25 },

  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 20,
    marginBottom: -30,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 25,
  },

  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
  },

  registerButton: {
    marginTop: 5,
    paddingVertical: 14,
    borderRadius: 8,
  },

  registerButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },

  link: {
    marginTop: 25,
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 14,
  },

  error: {
    textAlign: 'center',
    marginBottom: 10,
  },
});
