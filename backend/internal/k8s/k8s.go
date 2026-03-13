package k8s

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

type Client struct {
	clientset *kubernetes.Clientset
	namespace string
}

func New(kubeconfigPath string) (*Client, error) {
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to build config: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create clientset: %w", err)
	}

	return &Client{
		clientset: clientset,
		namespace: "default",
	}, nil
}

func (c *Client) CreatePod(name, image string) error {
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
			Labels: map[string]string{
				"app":     "kodekloud-lab",
				"session": name,
			},
		},
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{
				{
					Name:  "lab",
					Image: image,
					TTY:   true,
					Stdin: true,
					SecurityContext: &corev1.SecurityContext{
						Privileged: func(b bool) *bool { return &b }(true),
					},
				},
			},
			RestartPolicy: corev1.RestartPolicyNever,
		},
	}

	_, err := c.clientset.CoreV1().Pods(c.namespace).Create(context.TODO(), pod, metav1.CreateOptions{})
	return err
}

func (c *Client) DeletePod(name string) error {
	return c.clientset.CoreV1().Pods(c.namespace).Delete(context.TODO(), name, metav1.DeleteOptions{})
}

func (c *Client) GetPod(name string) (*corev1.Pod, error) {
	return c.clientset.CoreV1().Pods(c.namespace).Get(context.TODO(), name, metav1.GetOptions{})
}

func (c *Client) PodExists(name string) (bool, error) {
	_, err := c.GetPod(name)
	if err != nil {
		return false, nil
	}
	return true, nil
}

func (c *Client) ExecInPod(podName, containerName, command string) (string, error) {
	req := c.clientset.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(podName).
		Namespace(c.namespace).
		SubResource("exec").
		Param("container", containerName)

	req.VersionedParams(&corev1.PodExecOptions{
		Command: []string{"sh", "-c", command},
		Stdout:  true,
		Stderr:  true,
	}, nil)

	return "", nil
}
