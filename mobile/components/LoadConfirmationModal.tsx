// mobile/components/LoadConfirmationModal.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  Image
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

interface LoadConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: {
    actual_load_quantity: number;
    surat_jalan_photo: any;
  }) => void;
  isLoading: boolean;
}

const LoadConfirmationModal: React.FC<LoadConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [actualQuantity, setActualQuantity] = useState("");
  const [suratJalanPhotos, setSuratJalanPhotos] = useState<any[]>([]);
  
  const handleImagePicker = () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          const file = target.files[0];
          setSuratJalanPhotos([
            {
              uri: URL.createObjectURL(file),
              name: file.name,
              type: file.type,
            },
          ]);
        }
      };
      input.click();
    } else {
      Alert.alert(
        "Pilih Foto Surat Jalan",
        "Bagaimana cara Anda ingin mengambil foto?",
        [
          { 
            text: "Kamera", 
            onPress: takePicture 
          },
          { 
            text: "Galeri", 
            onPress: pickFromGallery 
          },
          { 
            text: "Batal", 
            style: "cancel" 
          },
        ],
        { cancelable: true }
      );
    }
  };

  const takePicture = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Error", "Permission to access camera was denied");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        // ✅ Append new photo to existing array
        setSuratJalanPhotos(prev => [...prev, result.assets[0]]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take picture");
    }
  };

  const pickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Error", "Permission to access gallery was denied");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setSuratJalanPhotos((prev) => [...prev, result.assets[0]]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleConfirm = () => {
    const quantity = parseFloat(actualQuantity);
    if (!actualQuantity || isNaN(quantity)) {
      Alert.alert("Error", "Masukkan volume muatan aktual yang valid");
      return;
    }
    // Surat jalan photos are now optional - drivers can upload them later
    // if (suratJalanPhotos.length === 0) {
    //   Alert.alert("Error", "Minimal 1 foto surat jalan harus diambil");
    //   return;
    // }
    onConfirm({
      actual_load_quantity: quantity,
      surat_jalan_photo: suratJalanPhotos,
    });
  };

  const resetForm = () => {
    setActualQuantity("");
    setSuratJalanPhotos([]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Konfirmasi Muatan</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose} 
            disabled={isLoading}
          >
            <FontAwesome5 name="times" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.infoSection}>
            <FontAwesome5 name="info-circle" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>
              Masukkan volume muatan aktual yang sudah dimuat ke kendaraan. 
              Foto surat jalan dapat diambil sekarang atau nanti di halaman detail perjalanan.
            </Text>
          </View>

          <View style={styles.quantitySection}>
            <Text style={styles.label}>Volume Muatan</Text>
            <TextInput
              style={styles.input}
              value={actualQuantity}
              onChangeText={setActualQuantity}
              placeholder="Contoh: 3.2"
              keyboardType="numeric"
              editable={!isLoading}
            />
            <Text style={styles.unitText}>m³</Text>
          </View>

          <View style={styles.photoSection}>
            <Text style={styles.label}>Foto Surat Jalan (Opsional)</Text>
            
            {suratJalanPhotos.length > 0 ? (
              <View style={styles.photoPreviewContainer}>
                {suratJalanPhotos.map((photo, idx) => (
                  <View key={idx} style={styles.photoCard}>
                    {photo.uri && (
                      <Image
                        source={{ uri: photo.uri }}
                        style={styles.previewImage}
                      />
                    )}
                    <View style={styles.photoActions}>
                      <TouchableOpacity
                        style={styles.retakeButton}
                        onPress={() => {
                          setSuratJalanPhotos(
                            suratJalanPhotos.filter((_, i) => i !== idx)
                          );
                        }}
                      >
                        <FontAwesome5 name="trash" size={16} color="#fff" />
                        <Text style={styles.retakeButtonText}>Hapus</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                
                <TouchableOpacity
                  style={styles.addMoreButton}
                  onPress={handleImagePicker}
                  disabled={isLoading}
                >
                  <FontAwesome5 name="plus" size={16} color="#fff" />
                  <Text style={styles.addMoreText}>Tambah Foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={handleImagePicker}
                disabled={isLoading}
              >
                <FontAwesome5 name="camera" size={24} color="#3b82f6" />
                <Text style={styles.photoButtonText}>
                  Ambil Foto Surat Jalan
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              resetForm();
              onClose();
            }}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Batal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!actualQuantity || isLoading) &&
                styles.disabledButton,
            ]}
            onPress={handleConfirm}
            disabled={!actualQuantity || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>
                Konfirmasi & Lanjutkan
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const webStyles = Platform.OS === 'web' ? {
  container: {
    maxWidth: 600,
    maxHeight: '90vh' as any,
    alignSelf: 'center' as any,
    marginVertical: '5vh' as any,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
  },
  header: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    maxHeight: 'calc(90vh - 200px)' as any,
  },
  actions: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  }
} : {};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#ffffff",
    ...webStyles.container,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    ...webStyles.header,
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: "#111827",
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  content: { 
    flex: 1, 
    paddingHorizontal: 32,
    paddingVertical: 24,
    ...webStyles.content,
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#eff6ff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#dbeafe",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#1e40af",
    lineHeight: 22,
    fontWeight: "500",
  },
  quantitySection: { marginBottom: 32 },
  label: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#111827", 
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  quantityInfo: {
    backgroundColor: "#fef3c7",
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
    borderWidth: 1,
    borderColor: "#fde68a",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  minimalText: { 
    fontSize: 15, 
    color: "#92400e", 
    fontWeight: "600",
  },
  input: {
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 20,
    backgroundColor: "#ffffff",
    textAlign: "center",
    fontWeight: "700",
    minHeight: 56,
    color: "#111827",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unitText: {
    fontSize: 18,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "600",
  },
  photoSection: { marginBottom: 32 },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#3b82f6",
    borderRadius: 16,
    paddingVertical: 24,
    backgroundColor: "#f8fafc",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  photoButtonText: {
    fontSize: 16,
    color: "#3b82f6",
    marginLeft: 12,
    fontWeight: "600",
  },
  photoPreviewContainer: {
    marginBottom: 20,
  },
  photoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  previewImage: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  photoActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    backgroundColor: "#f9fafb",
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  retakeButtonText: {
    color: "#ffffff",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  addMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  addMoreText: {
    color: "#ffffff",
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 32,
    paddingVertical: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    gap: 16,
    ...webStyles.actions,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    backgroundColor: "#ffffff",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cancelButtonText: { 
    fontSize: 16, 
    color: "#6b7280", 
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  confirmButtonText: { 
    fontSize: 16, 
    color: "#ffffff", 
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  disabledButton: { 
    backgroundColor: "#9ca3af",
    elevation: 1,
    shadowOpacity: 0.05,
  },
});

export default LoadConfirmationModal;