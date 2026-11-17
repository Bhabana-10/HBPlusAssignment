import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "./lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("user");
  const [error, setError] = useState("");
  const [previewDashboard, setPreviewDashboard] = useState(false);
  const displayEmail = session?.user?.email || "preview@hbplus.fit";
  const displayName =
    session?.user?.user_metadata?.full_name || "HB+ Team Member";
  const profilePicture = session?.user?.user_metadata?.avatar_url || null;
  const isPreview = __DEV__ && previewDashboard && !session;

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        const currentSession = data?.session ?? null;
        const email = currentSession?.user?.email?.toLowerCase() || "";

        if (currentSession && !email.endsWith("@hbplus.fit")) {
          await supabase.auth.signOut();

          setSession(null);
          setUserRole("user");
          setError(
            "Access restricted. Please login using your official domain email.",
          );
        } else {
          setSession(currentSession);

          if (currentSession?.user) {
            await saveUserProfile(currentSession.user);
            await fetchUserRole(currentSession.user.id);
          } else {
            setUserRole("user");
          }
        }
      } catch (err) {
        setError(err.message || "Unable to verify your session.");
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const saveUserProfile = async (user) => {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: user.user_metadata?.full_name || "",
        email: user.email,
        avatar_url: user.user_metadata?.avatar_url || "",
      },
      { onConflict: "id" },
    );

    if (error) {
      console.error("Profile save error:", error.message);
    }
  };

  const fetchUserRole = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Role fetch error:", error.message);
      setUserRole("user");
      return;
    }

    setUserRole(data.role || "user");
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      setLoading(true);

      const redirectUrl = Linking.createURL("/");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
      );

      if (result.type === "success") {
        const url = new URL(result.url);

        const params = new URLSearchParams(url.search);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

        const authError =
          params.get("error_description") ||
          hashParams.get("error_description");

        if (authError) {
          throw new Error(decodeURIComponent(authError));
        }

        const code = params.get("code");

        if (code) {
          const { data: authData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) throw exchangeError;

          const loggedInUser = authData.user;
          const email = loggedInUser?.email?.toLowerCase() || "";

          if (!email.endsWith("@hbplus.fit")) {
            await supabase.auth.signOut();
            setSession(null);
            setUserRole("user");

            throw new Error(
              "Access restricted. Please login using your official domain email.",
            );
          }

          // Save the approved user's details in Supabase
          if (loggedInUser) {
            await saveUserProfile(loggedInUser);
            await fetchUserRole(loggedInUser.id);
          }
        } else {
          throw new Error("Google login could not be completed.");
        }
      } else if (result.type === "cancel") {
        setError("Login was cancelled.");
      }
    } catch (err) {
      const message = err.message || "Something went wrong.";
      setError(
        message.toLowerCase().includes("hbplus.fit")
          ? "Access restricted. Please login using your official domain email."
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setError("");

    // Exit local dashboard preview
    if (__DEV__ && previewDashboard && !session) {
      setPreviewDashboard(false);
      return;
    }

    // Actual Google-authenticated logout
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Please wait...</Text>
      </View>
    );
  }

  if (session || (__DEV__ && previewDashboard)) {
    return (
      <ScrollView
        style={styles.dashboardBackground}
        contentContainerStyle={styles.dashboardContainer}
      >
        <View style={styles.dashboardHeader}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandIconText}>HB+</Text>
            </View>
            <View>
              <Text style={styles.brandName}>HB+ Workspace</Text>
              <Text style={styles.brandSubtitle}>Employee Portal</Text>
            </View>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {isPreview ? "● Preview Mode" : "● Active"}
            </Text>
          </View>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeLabel}>YOUR WORKSPACE</Text>
          <Text style={styles.dashboardHeading}>
            Welcome back,{" "}
            {isPreview ? "Team Member" : displayName.split(" ")[0]}!
          </Text>
          <Text style={styles.dashboardDescription}>
            Your secure employee workspace is ready.
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✓</Text>
            <Text style={styles.statValue}>Active</Text>
            <Text style={styles.statLabel}>Account Status</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>♙</Text>
            <Text style={styles.statValue}>
              {isPreview ? "Preview" : "Verified"}
            </Text>
            <Text style={styles.statLabel}>Authentication</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Your Account</Text>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              {profilePicture ? (
                <Image
                  source={{ uri: profilePicture }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {displayEmail[0].toUpperCase()}
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{displayEmail}</Text>
              <Text style={styles.profileRole}>
                {isPreview ? "Preview Account" : userRole.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {!isPreview && userRole === "admin" && (
          <View style={styles.adminPanel}>
            <Text style={styles.adminTitle}>Admin Controls</Text>
            <Text style={styles.adminDescription}>
              Welcome, Administrator! You have access to administrative
              features.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Workspace Overview</Text>

          <View style={styles.resourceCard}>
            <Text style={styles.resourceIcon}>▦</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.resourceTitle}>Dashboard Overview</Text>
              <Text style={styles.resourceDescription}>
                Your employee workspace and account overview.
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </View>

          <View style={styles.resourceCard}>
            <Text style={styles.resourceIcon}>♧</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.resourceTitle}>Team Resources</Text>
              <Text style={styles.resourceDescription}>
                A dedicated space for team resources.
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </View>

          <View style={styles.resourceCard}>
            <Text style={styles.resourceIcon}>⚙</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.resourceTitle}>Account Settings</Text>
              <Text style={styles.resourceDescription}>
                Manage your signed-in account.
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </View>
        </View>

        <View style={styles.securityCard}>
          <Text style={styles.securityTitle}>
            {isPreview ? "Preview Environment" : "✓ Account Protected"}
          </Text>
          <Text style={styles.securityDescription}>
            {isPreview
              ? "You are viewing sample dashboard data. No user is authenticated."
              : "You are securely authenticated through Google."}
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.dashboardFooter}>
          HB+ Workspace · Secure Employee Access
        </Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>HB+</Text>

        <Text style={styles.heading}>Welcome to HB+</Text>

        <Text style={styles.subtitle}>
          Sign in with your official company account to continue.
        </Text>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>
        {__DEV__ && (
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => {
              setError("");
              setPreviewDashboard(true);
            }}
          >
            <Text style={styles.previewButtonText}>
              Preview Dashboard (Development Only)
            </Text>
          </TouchableOpacity>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.footer}>Secure access for HB+ team members</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    elevation: 4,
  },
  logo: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#2563EB",
    marginBottom: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#172033",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#667085",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 30,
  },
  googleButton: {
    width: "100%",
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  googleButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    fontSize: 12,
    color: "#98A2B3",
    marginTop: 25,
  },
  loadingText: {
    marginTop: 12,
    color: "#667085",
  },
  error: {
    color: "#DC2626",
    textAlign: "center",
    marginTop: 16,
  },

  dashboardBackground: {
    flex: 1,
    backgroundColor: "#F4F6FA",
  },

  dashboardContainer: {
    padding: 24,
    paddingTop: 45,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },

  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 45,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  brandIcon: {
    width: 46,
    height: 46,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  brandIconText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "bold",
  },

  brandName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#172033",
  },

  brandSubtitle: {
    fontSize: 12,
    color: "#667085",
    marginTop: 3,
  },

  statusBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  statusText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "600",
  },

  welcomeSection: {
    marginBottom: 28,
  },

  welcomeLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#2563EB",
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  dashboardHeading: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#172033",
  },

  dashboardDescription: {
    color: "#667085",
    fontSize: 14,
    marginTop: 9,
  },

  statsContainer: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 35,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 14,
    elevation: 2,
  },

  statIcon: {
    color: "#2563EB",
    fontSize: 25,
    marginBottom: 12,
  },

  statValue: {
    color: "#172033",
    fontSize: 20,
    fontWeight: "bold",
  },

  statLabel: {
    color: "#667085",
    fontSize: 12,
    marginTop: 5,
  },

  section: {
    marginBottom: 28,
  },

  sectionHeading: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#172033",
    marginBottom: 15,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 14,
    gap: 14,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  avatarText: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#2563EB",
  },

  profileName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#172033",
  },

  profileEmail: {
    fontSize: 12,
    color: "#667085",
    marginTop: 5,
  },

  resourceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    gap: 15,
  },

  resourceIcon: {
    fontSize: 25,
    color: "#2563EB",
  },

  resourceTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#172033",
  },

  resourceDescription: {
    fontSize: 12,
    color: "#667085",
    marginTop: 5,
  },

  arrow: {
    fontSize: 25,
    color: "#98A2B3",
  },

  securityCard: {
    backgroundColor: "#EAF2FF",
    padding: 20,
    borderRadius: 14,
    marginBottom: 25,
  },

  securityTitle: {
    color: "#1D4ED8",
    fontSize: 15,
    fontWeight: "bold",
  },

  securityDescription: {
    color: "#475569",
    fontSize: 12,
    marginTop: 7,
  },

  logoutButton: {
    backgroundColor: "#172033",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },

  logoutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  dashboardFooter: {
    textAlign: "center",
    color: "#98A2B3",
    fontSize: 11,
    marginTop: 25,
  },
  previewButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
  },

  previewButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
  profileRole: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginTop: 5,
    letterSpacing: 1,
  },
});
